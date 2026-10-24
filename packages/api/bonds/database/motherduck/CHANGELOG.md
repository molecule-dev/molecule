# @molecule/api-database-motherduck

## 1.1.1

### Patch Changes

- Add the SQL-compatibility type contract (a provider's declared capabilities, a requirement and a diagnostic) to the database core, and translate partial indexes for DuckDB without changing their semantics. The bond refuses a foreign-key referential action it cannot reproduce instead of dropping it.
- Updated dependencies
  - @molecule/api-database-duckdb@1.1.1

## 1.1.0

### Minor Changes

- Adds `@molecule/api-database-motherduck`, a MotherDuck (hosted DuckDB) database provider for `@molecule/api-database` — the same DuckDB SQL and DataStore as the duckdb bond, reached through an `md:` connection string with `MOTHERDUCK_TOKEN`, instance caching (`DuckDBInstance.fromCache`) per MotherDuck's guidance, and the same migration runner on the remote database.

### Patch Changes

- Updated dependencies
  - @molecule/api-database-duckdb@1.1.0
