---
'@molecule/api-database-d1': minor
'@molecule/api-database-mysql': minor
'@molecule/api-database-pglite': minor
'@molecule/api-database-postgresql': minor
'@molecule/api-database-sqlite': minor
---

Declare each database provider's SQL feature capabilities from its own source, and refuse a MySQL UNIQUE partial index before applying it instead of silently widening the constraint to every row.
