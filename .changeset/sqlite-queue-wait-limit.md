---
'@molecule/api-database-sqlite': patch
---

A query that waits 30 s behind an open transaction fails with an error naming `withTransaction()` instead of waiting forever.
