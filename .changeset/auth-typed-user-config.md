---
'@molecule/app-auth': patch
'@molecule/app-react': patch
'@molecule/app-bonds-default-react': patch
---

`AuthClientConfig` accepts the app's user type, so `mapAuthResponse` is checked against the same profile `createJWTAuthClient` returns; `useAuth()` now exposes `setSession` for adopting a caller-issued session in one update.
