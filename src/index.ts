#!/usr/bin/env node
/**
 * mcp-dns — Model Context Protocol server for DNS lookups.
 *
 * Tools:
 *   resolve_dns  — A, AAAA, CNAME, MX, TXT, NS, SOA, SRV, CAA records
 *   reverse_dns  — PTR lookup for an IP address
 *
 * Uses node:dns only: no external APIs, no keys, no telemetry.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import {
  RECORD_TYPES,
  isLikelyHostname,
  resolveRecords,
  reverseLookup,
} from "./dns.js";

const server = new McpServer({ name: "mcp-dns", version: "1.0.0" });

server.tool(
  "resolve_dns",
  "Resolve DNS records for a domain. Supports A, AAAA, CNAME, MX, TXT, NS, SOA, SRV and CAA. For SRV, pass the full query name (e.g. _xmpp-server._tcp.gmail.com).",
  {
    domain: z
      .string()
      .describe("Domain name to resolve, e.g. example.com"),
    recordType: z
      .enum(RECORD_TYPES)
      .default("A")
      .describe("DNS record type to fetch"),
  },
  async ({ domain, recordType }) => {
    if (!isLikelyHostname(domain)) {
      throw new Error(`not a valid hostname: ${domain}`);
    }
    let records: unknown;
    try {
      records = await resolveRecords(domain, recordType);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code ?? "";
      if (code === "ENOTFOUND" || code === "ENODATA") {
        throw new Error(`no ${recordType} records found for ${domain}`);
      }
      throw err;
    }
    if (Array.isArray(records) && records.length === 0) {
      throw new Error(`no ${recordType} records found for ${domain}`);
    }
    return {
      content: [{ type: "text", text: JSON.stringify(records, null, 2) }],
    };
  },
);

server.tool(
  "reverse_dns",
  "Reverse DNS (PTR) lookup: resolve an IP address to hostnames.",
  {
    ip: z.string().describe("IPv4 or IPv6 address, e.g. 127.0.0.1"),
  },
  async ({ ip }) => {
    let hostnames: string[];
    try {
      hostnames = await reverseLookup(ip);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code ?? "";
      if (code === "ENOTFOUND" || code === "ENODATA") {
        throw new Error(`no PTR records found for ${ip}`);
      }
      throw err;
    }
    if (hostnames.length === 0) {
      throw new Error(`no PTR records found for ${ip}`);
    }
    return {
      content: [{ type: "text", text: JSON.stringify(hostnames, null, 2) }],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("mcp-dns failed to start:", err);
  process.exit(1);
});
