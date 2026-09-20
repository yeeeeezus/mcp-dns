/**
 * DNS lookup logic for mcp-dns.
 *
 * Pure wrapper over node:dns/promises so it is testable without the
 * MCP layer. No external APIs, no caching beyond the OS resolver.
 */

import { Resolver } from "node:dns/promises";

export const RECORD_TYPES = [
  "A",
  "AAAA",
  "CNAME",
  "MX",
  "TXT",
  "NS",
  "SOA",
  "SRV",
  "CAA",
] as const;

export type RecordType = (typeof RECORD_TYPES)[number];

const resolver = new Resolver();

const HOSTNAME_RE = /^_?[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\._?[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.?$/;

export function isLikelyHostname(name: string): boolean {
  return name.length <= 253 && HOSTNAME_RE.test(name);
}

export async function resolveRecords(
  domain: string,
  recordType: RecordType,
): Promise<unknown> {
  switch (recordType) {
    case "A":
      return resolver.resolve4(domain);
    case "AAAA":
      return resolver.resolve6(domain);
    case "CNAME":
      return resolver.resolveCname(domain);
    case "MX":
      return resolver.resolveMx(domain);
    case "TXT":
      // TXT records arrive as chunked strings; join chunks into one string.
      const txt = await resolver.resolveTxt(domain);
      return txt.map((chunks) => chunks.join(""));
    case "NS":
      return resolver.resolveNs(domain);
    case "SOA":
      return resolver.resolveSoa(domain);
    case "SRV":
      return resolver.resolveSrv(domain);
    case "CAA":
      return resolver.resolveCaa(domain);
  }
}

export async function reverseLookup(ip: string): Promise<string[]> {
  return resolver.reverse(ip);
}
