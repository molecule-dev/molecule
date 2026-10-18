---
'@molecule/app-auth': patch
---

In a browser the auth client now keeps the session in Web Storage by default (and warns when an explicit `'memory'` store is paired with a `tokenKey`), so a page reload stays signed in without extra wiring.
