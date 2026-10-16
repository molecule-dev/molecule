# @molecule/api-database-pglite

## 1.2.1

### Patch Changes

- 8cb65bb: An unknown query operator's error lists the valid operators, which are lowercase.

## 1.2.0

### Minor Changes

- 390283d: Migrations are recorded in a `_molecule_migrations` table, so each file runs once; a database migrated before is adopted on its first boot, and SQLite ignores `--` comments when it adds columns declared in a `CREATE TABLE`.

## 1.1.0

### Minor Changes

- a8cce33: Queries made inside `withTransaction()` from `@molecule/api-database` run on its transaction.
