# @molecule/api-database-postgresql

## 1.4.0

### Minor Changes

- Declare each database provider's SQL feature capabilities from its own source, and refuse a MySQL UNIQUE partial index before applying it instead of silently widening the constraint to every row.

## 1.3.1

### Patch Changes

- 25d125a: Reject malformed `findMany`, `findOne`, `count`, `updateMany` and `deleteMany` arguments with an actionable `TypeError` before running a query, instead of silently dropping the filter and reading every row.

## 1.3.0

### Minor Changes

- 7b65737: Registers a critical database readiness probe and a pool-closing shutdown hook when @molecule/api-process-lifecycle is present.

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

## 1.0.5

### Patch Changes

- 5315e5b: The migrator no longer prints the full `DATABASE_URL` (and the password in it) when it cannot connect; it names the host and database only.

## 1.0.4

### Patch Changes

- Identifiers containing hyphens are accepted — they are quoted at every interpolation site.

## 1.0.2

### Patch Changes

- 9ea501c: Accept hyphenated table/column identifiers (e.g. `resource-share-links`). Every interpolation site quotes identifiers, so hyphens are safe; the previous allowlist rejected `@molecule/api-resource-share`'s tables, making every share-link operation throw.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-bond@1.0.1
  - @molecule/api-database@1.0.1
  - @molecule/api-secrets@1.0.1
