---
'@molecule/api-mock-server': minor
---

The mock server now binds `127.0.0.1` (loopback) by default instead of every interface — it serves fixture data with permissive CORS, so LAN-wide exposure is now an explicit opt-in via `host: '0.0.0.0'` in the config or `--host` on the CLI. The running `MockServer` also reports the bound address as `host`.
