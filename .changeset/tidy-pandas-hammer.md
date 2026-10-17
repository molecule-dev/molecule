---
'@molecule/api-resource': patch
---

An Express 5 `Request` is now assignable to `MoleculeRequest` without a cast (`params` accepts `string | string[]`, as Express declares), so handlers can pass `req` straight to functions such as `authorization.set`.
