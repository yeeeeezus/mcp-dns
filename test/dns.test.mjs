// Unit tests for the DNS layer (runs against the real OS resolver).
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  resolveRecords,
  reverseLookup,
  isLikelyHostname,
} from "../dist/dns.js";

const IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}$/;

test("resolve A for localhost", async () => {
  const out = await resolveRecords("localhost", "A");
  assert.deepEqual(out, ["127.0.0.1"]);
});

test("reverse PTR for 127.0.0.1 returns hostnames", async () => {
  const out = await reverseLookup("127.0.0.1");
  assert.ok(Array.isArray(out) && out.length >= 1);
  for (const h of out) assert.match(h, /^[a-zA-Z0-9.-]+\.?$/);
});

test("resolve A for github.com returns IPv4 addresses", async () => {
  const out = await resolveRecords("github.com", "A");
  assert.ok(Array.isArray(out) && out.length > 0);
  for (const a of out) assert.match(a, IPV4_RE);
});

test("resolve MX for gmail.com points at Google", async () => {
  const out = await resolveRecords("gmail.com", "MX");
  assert.ok(Array.isArray(out) && out.length > 0);
  assert.ok(out.some((mx) => mx.exchange.includes("google")));
});

test("resolve TXT returns joined strings", async () => {
  const out = await resolveRecords("github.com", "TXT");
  assert.ok(Array.isArray(out) && out.length > 0);
  for (const t of out) assert.equal(typeof t, "string");
});

test("ENOTFOUND surfaces for a nonexistent domain", async () => {
  await assert.rejects(
    () => resolveRecords("nonexistent.invalid", "A"),
    (err) => err.code === "ENOTFOUND",
  );
});

test("hostname validation accepts real names, rejects junk", () => {
  assert.ok(isLikelyHostname("example.com"));
  assert.ok(isLikelyHostname("localhost"));
  assert.ok(isLikelyHostname("_xmpp-server._tcp.gmail.com"));
  assert.ok(!isLikelyHostname("http://example.com"));
  assert.ok(!isLikelyHostname("example.com/path"));
  assert.ok(!isLikelyHostname(""));
  assert.ok(!isLikelyHostname("a".repeat(300)));
});
