# @molecule/api-database-pglite

## 1.3.1

### Patch Changes

- Preserve authored TypeScript declarations in generated API documentation.

## 1.3.0

### Minor Changes

- Declare each database provider's SQL feature capabilities from its own source, and refuse a MySQL UNIQUE partial index before applying it instead of silently widening the constraint to every row.

## 1.2.3

### Patch Changes

- 25d125a: Reject malformed `findMany`, `findOne`, `count`, `updateMany` and `deleteMany` arguments with an actionable `TypeError` before running a query, instead of silently dropping the filter and reading every row.

## 1.2.2

### Patch Changes

- ac33c4b: A list given to a one-value operator (`=`, `!=`, `<`…) throws instead of silently matching nothing.

## 1.2.1

### Patch Changes

- 8cb65bb: An unknown query operator's error lists the valid operators, which are lowercase.

## 1.2.0

### Minor Changes

- 390283d: Migrations are recorded in a `_molecule_migrations` table, so each file runs once; a database migrated before is adopted on its first boot, and SQLite ignores `--` comments when it adds columns declared in a `CREATE TABLE`.

## 1.1.0

### Minor Changes

- a8cce33: Queries made inside `withTransaction()` from `@molecule/api-database` run on its transaction.
