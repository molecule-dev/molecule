---
'@molecule/api-database-mysql': patch
---

A transaction's connection is released even when `COMMIT` or `ROLLBACK` fails.
