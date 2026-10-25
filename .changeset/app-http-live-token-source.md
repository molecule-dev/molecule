---
'@molecule/app-http': minor
---

`setAuthTokenSource()` makes the bonded client — and the fallback `getClient()` returns while no client is bonded — read the source on each request, through the new optional `HttpClient.setAuthTokenResolver()` (the fetch client implements it) or, for a client without it, a request interceptor; so a session adopted with no auth event (`setSession()`, `setAccessToken()`) is sent instead of the previous account's token, a source with no token sends no `Authorization` header, and removing the source keeps the token it last returned.
