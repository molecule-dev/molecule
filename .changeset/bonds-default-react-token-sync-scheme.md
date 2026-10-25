---
'@molecule/app-bonds-default-react': patch
---

`createDefaultAuthClientWithFetchClient` sends the auth config's `authScheme` and mirrors auth events into the client the app bonds last, and `createDefaultHttpClientWithAuthBearer` sends a synced token with its own `authScheme`; with `@molecule/app-http` 1.5.0 both auth bonds follow a session adopted by `setSession()` or an OAuth callback.
