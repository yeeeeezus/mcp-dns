# Contributing

Bug reports and pull requests are welcome.

- Keep diffs small and focused on one issue.
- Add or update a test for any behavior change; `npm test` must pass, including the stdio integration test.
- New record types must come from the `node:dns/promises` Resolver API — no external APIs.

## Setup

```console
$ npm install
$ npm test
```
