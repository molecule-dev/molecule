# @molecule/api-mock-server

## 1.2.0

### Minor Changes

- 685a05e: Add `buildMockFixtureSet`, `serializeFixtureSet` and the browser-safe `./router` and `./browser` entries, so a static build can answer `fetch` from the same fixtures and routing the server uses.

### Patch Changes

- 509b9c5: In the browser fetch, a hand-written fixture now answers its endpoint instead of the list the scanner sampled for the same path.

## 1.1.0

### Minor Changes

- 2354143: The mock server now binds `127.0.0.1` (loopback) by default instead of every interface — it serves fixture data with permissive CORS, so LAN-wide exposure is now an explicit opt-in via `host: '0.0.0.0'` in the config or `--host` on the CLI. The running `MockServer` also reports the bound address as `host`.
