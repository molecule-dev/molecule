---
'@molecule/api-database-sqlite': patch
---

Re-running migrations adds a column that a `CREATE TABLE IF NOT EXISTS` declares but the existing table lacks.
