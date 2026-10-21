---
'@molecule/api-database': patch
'@molecule/api-database-sqlite': patch
'@molecule/api-database-pglite': patch
'@molecule/api-database-postgresql': patch
'@molecule/api-database-mysql': patch
'@molecule/api-compliance-gdpr': patch
'@molecule/api-multi-tenancy-schema': patch
---

Reject malformed `findMany`, `findOne`, `count`, `updateMany` and `deleteMany` arguments with an actionable `TypeError` before running a query, instead of silently dropping the filter and reading every row.
