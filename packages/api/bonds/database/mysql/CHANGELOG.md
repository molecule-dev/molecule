# @molecule/api-database-mysql

## 1.3.0

### Minor Changes

- 7b65737: Registers a critical database readiness probe and a pool-closing shutdown hook when @molecule/api-process-lifecycle is present.

## 1.2.4

### Patch Changes

- c3b7ee2: `convertPlaceholders` refuses a statement whose `$N` placeholders and supplied values disagree — a value that no placeholder names, or a placeholder with no value — instead of dropping the value (or binding `NULL`) in silence and returning the wrong rows. The error names the placeholder and the statement, matching the contract PostgreSQL enforces at bind time.

## 1.2.3

### Patch Changes

- ac33c4b: A list given to a one-value operator (`=`, `!=`, `<`…) throws instead of silently matching nothing.

## 1.2.2

### Patch Changes

- 8cb65bb: An unknown query operator's error lists the valid operators, which are lowercase.

## 1.2.1

### Patch Changes

- 2a7c48a: A migration's `ALTER TABLE … ADD COLUMN IF NOT EXISTS` is accepted and applied when the column is missing, instead of failing the migration run.

## 1.2.0

### Minor Changes

- 390283d: Migrations are recorded in a `_molecule_migrations` table, so each file runs once; a database migrated before is adopted on its first boot, and SQLite ignores `--` comments when it adds columns declared in a `CREATE TABLE`.

## 1.1.0

### Minor Changes

- a8cce33: Queries made inside `withTransaction()` from `@molecule/api-database` run on its transaction.

### Patch Changes

- a8cce33: A transaction's connection is released even when `COMMIT` or `ROLLBACK` fails.

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
