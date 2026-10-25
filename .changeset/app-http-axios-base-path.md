---
'@molecule/app-http-axios': patch
---

A path that already starts with `baseURL`'s path (`https://host/api` + `/api/users`, `/api?page=2`) is requested as written, the URL `@molecule/app-http`'s fetch client requests, and an existing `instance` is joined to the bonded `baseURL` too.
