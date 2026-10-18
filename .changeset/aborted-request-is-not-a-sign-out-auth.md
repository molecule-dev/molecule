---
'@molecule/app-auth': patch
---

A background token refresh that fails without an HTTP answer (network drop, aborted request, 5xx) keeps the session; only a 401/403 from the server signs the user out.
