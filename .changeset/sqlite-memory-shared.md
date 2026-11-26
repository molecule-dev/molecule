---
'@molecule/api-database-sqlite': patch
---

With `SQLITE_PATH=:memory:`, the migrations and the pool share one in-memory database, so a server serves the tables it migrated at boot.
