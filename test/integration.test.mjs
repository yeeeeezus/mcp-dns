// Integration test: speak real MCP JSON-RPC over stdio to the built server.
// Proves the handshake, tool listing and an actual DNS resolution work.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

function startServer() {
  const child = spawn(process.execPath, ["dist/index.js"], {
    stdio: ["pipe", "pipe", "pipe"],
  });
  const messages = [];
  let buf = "";
  const waiters = [];
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    buf += chunk;
    let idx;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line) continue;
      const msg = JSON.parse(line);
      messages.push(msg);
      for (let i = waiters.length - 1; i >= 0; i--) {
        if (waiters[i].pred(msg)) {
          waiters[i].resolve(msg);
          waiters.splice(i, 1);
        }
      }
    }
  });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (c) => (stderr += c));
  return {
    child,
    stderr,
    send(obj) {
      child.stdin.write(JSON.stringify(obj) + "\n");
    },
    waitFor(pred, timeoutMs = 15000) {
      const existing = messages.find(pred);
      if (existing) return Promise.resolve(existing);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error(`timeout waiting for message; stderr: ${stderr}`)),
          timeoutMs,
        );
        waiters.push({
          pred,
          resolve: (msg) => {
            clearTimeout(timer);
            resolve(msg);
          },
        });
      });
    },
  };
}

test("full MCP stdio handshake and DNS resolution", async () => {
  const s = startServer();
  try {
    // 1. initialize
    s.send({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "mcp-dns-test", version: "1.0.0" },
      },
    });
    const init = await s.waitFor((m) => m.id === 1);
    assert.equal(init.result.serverInfo.name, "mcp-dns");
    assert.ok(init.result.protocolVersion);

    // 2. initialized notification
    s.send({ jsonrpc: "2.0", method: "notifications/initialized" });

    // 3. tools/list
    s.send({ jsonrpc: "2.0", id: 2, method: "tools/list" });
    const tools = await s.waitFor((m) => m.id === 2);
    const names = tools.result.tools.map((t) => t.name).sort();
    assert.deepEqual(names, ["resolve_dns", "reverse_dns"]);
    const resolveTool = tools.result.tools.find((t) => t.name === "resolve_dns");
    assert.match(resolveTool.description, /SRV/);

    // 4. call resolve_dns on localhost
    s.send({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "resolve_dns",
        arguments: { domain: "localhost", recordType: "A" },
      },
    });
    const call = await s.waitFor((m) => m.id === 3);
    assert.equal(call.result.isError, undefined);
    const text = call.result.content[0].text;
    assert.deepEqual(JSON.parse(text), ["127.0.0.1"]);

    // 5. call reverse_dns on 127.0.0.1
    s.send({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "reverse_dns", arguments: { ip: "127.0.0.1" } },
    });
    const rev = await s.waitFor((m) => m.id === 4);
    const ptrs = JSON.parse(rev.result.content[0].text);
    assert.ok(Array.isArray(ptrs) && ptrs.length >= 1);
    for (const h of ptrs) assert.match(h, /^[a-zA-Z0-9.-]+\.?$/);

    // 6. invalid hostname returns a clean tool error, not a crash
    s.send({
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: {
        name: "resolve_dns",
        arguments: { domain: "http://junk", recordType: "A" },
      },
    });
    const bad = await s.waitFor((m) => m.id === 5);
    assert.ok(bad.result.isError, "expected isError for invalid hostname");
  } finally {
    s.child.kill();
  }
});
