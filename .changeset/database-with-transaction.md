---
'@molecule/api-database': minor
---

Adds `withTransaction(fn)`: every database call made inside `fn` (the CRUD helpers and `query()`) joins one transaction, committed when `fn` resolves and rolled back when it throws.
