---
'@molecule/app-http-axios': minor
---

Implements `setAuthTokenResolver()` from `@molecule/app-http` 1.5.0: the registered token source is applied to each request after the auth gate, while an `Authorization` header passed per request or in `defaultHeaders` keeps its precedence.
