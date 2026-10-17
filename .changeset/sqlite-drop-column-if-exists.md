---
'@molecule/api-database-sqlite': patch
---

`ALTER TABLE … DROP COLUMN IF EXISTS` now applies on SQLite: the migrator drops the statement when the table has no such column (the no-op Postgres performs) and strips the clause SQLite cannot parse. A migration written with it used to fail the run — and an app booting on a fresh production database that never had the column could not start.
