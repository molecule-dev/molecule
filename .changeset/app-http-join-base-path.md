---
'@molecule/app-http': patch
---

The fetch client no longer repeats an absolute `baseURL`'s path (`https://host/api` + `/api/users`), joins a base and a path with exactly one `/`, and requests protocol-relative URLs (`//cdn…`) as written.
