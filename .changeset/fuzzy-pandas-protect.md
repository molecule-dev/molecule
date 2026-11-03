---
'@molecule/app-query-memory': patch
---

Prevent an older in-flight read from overwriting a newer value written with `set()`.
