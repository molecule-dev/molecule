---
'@molecule/api-database-sqlite': minor
'@molecule/api-database-postgresql': minor
'@molecule/api-database-mysql': minor
'@molecule/api-database-pglite': minor
---

Migrations are recorded in a `_molecule_migrations` table, so each file runs once; a database migrated before is adopted on its first boot, and SQLite ignores `--` comments when it adds columns declared in a `CREATE TABLE`.
