---
'@molecule/app-solid': minor
---

`MoleculeProvider` takes `@molecule/app-react`'s flat props and waits for the session by default when given `auth` (pass `awaitSession: false` to opt out; `config={…}` still works and is deprecated), and adds React's per-service provider components (`StateProvider`, `ThemeProvider`, `HttpProvider`, …) and the `UseDeviceResult`, `UseRouterResult` and `UseVersionResult` types.
