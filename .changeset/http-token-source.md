---
'@molecule/app-http': minor
---

`setAuthTokenSource(source)` gives every HTTP client bonded after (or at) the call the current access token, and `getClient()` returns its no-baseURL fallback without bonding it, so a client bonded later is still what every call sees.
