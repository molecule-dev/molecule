---
'@molecule/app-auth': patch
---

`AuthClientConfig.storage` states the trade-off plainly: in-memory is the secure default, and an app whose external contract requires the token at its own key opts in with `storage: createBrowserStorageAdapter()` plus `tokenKey: 'jwtToken'`.
