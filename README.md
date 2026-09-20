# mcp-dns

**Model Context Protocol server for DNS lookups** — gives AI agents two tools: `resolve_dns` (A, AAAA, CNAME, MX, TXT, NS, SOA, SRV, CAA) and `reverse_dns` (PTR). Built on `node:dns` only: no external APIs, no keys, no telemetry.

[![CI](https://github.com/yeeeeezus/mcp-dns/actions/workflows/ci.yml/badge.svg)](https://github.com/yeeeeezus/mcp-dns/actions/workflows/ci.yml)
[![npm](https://img.shields.io/badge/runtime-node%20%3E%3D18-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/protocol-MCP-6E43B8)](https://modelcontextprotocol.io)

## Playground

No install needed — try live DNS lookups in the browser at **https://yeeeeezus.github.io/mcp-dns/** (DNS-over-HTTPS queries go straight from your browser to Google Public DNS). The server below is the same idea for AI agents.

## Why

Agents doing web work, security review, infrastructure debugging or mail deliverability checks constantly need DNS facts: where does this domain point, what are its nameservers, does it have SPF/DMARC records, what does this IP reverse to. Instead of hoping the model remembers a shell one-liner, give it typed tools that return structured answers over the MCP stdio transport.

## Tools

### `resolve_dns`

| parameter | type | description |
|-----------|------|-------------|
| `domain` | string | domain to resolve, e.g. `example.com` |
| `recordType` | enum | `A` (default), `AAAA`, `CNAME`, `MX`, `TXT`, `NS`, `SOA`, `SRV`, `CAA` |

For SRV, pass the full query name (e.g. `_xmpp-server._tcp.gmail.com`).

### `reverse_dns`

| parameter | type | description |
|-----------|------|-------------|
| `ip` | string | IPv4 or IPv6 address, e.g. `1.1.1.1` |

## Example exchange

Request:

```json
{ "name": "resolve_dns", "arguments": { "domain": "gmail.com", "recordType": "MX" } }
```

Response:

```json
[
  { "exchange": "gmail-smtp-in.l.google.com", "priority": 5, "type": "MX" },
  { "exchange": "alt1.gmail-smtp-in.l.google.com", "priority": 10, "type": "MX" },
  { "exchange": "alt2.gmail-smtp-in.l.google.com", "priority": 20, "type": "MX" },
  { "exchange": "alt3.gmail-smtp-in.l.google.com", "priority": 30, "type": "MX" },
  { "exchange": "alt4.gmail-smtp-in.l.google.com", "priority": 40, "type": "MX" }
]
```

## Install

Run directly without cloning:

```console
$ npx github:yeeeeezus/mcp-dns
```

or from a checkout:

```console
$ git clone https://github.com/yeeeeezus/mcp-dns
$ cd mcp-dns && npm install && npm run build
$ node dist/index.js
```

### Claude Desktop / any MCP client

```json
{
  "mcpServers": {
    "mcp-dns": {
      "command": "npx",
      "args": ["github:yeeeeezus/mcp-dns"]
    }
  }
}
```

## Behavior notes

- `ENOTFOUND` / `ENODATA` are mapped to clean tool errors ("no MX records found for …") instead of stack traces.
- Hostnames are validated before resolution; URLs and paths are rejected up front.
- TXT record chunks are joined into single strings (the DNS wire format splits long TXT values).
- Output is pretty-printed JSON text, one record set per call.

## Development

```console
$ npm install
$ npm test
```

8 tests, including a full integration test that spawns the built server and speaks MCP JSON-RPC over stdio: initialize handshake, `tools/list`, two real `tools/call` resolutions, and an error-path check.

## License

[MIT](LICENSE)
