# @molecule/api-database-duckdb

## 1.1.2

### Patch Changes

- Preserve authored TypeScript declarations in generated API documentation.

## 1.1.1

### Patch Changes

- Add the SQL-compatibility type contract (a provider's declared capabilities, a requirement and a diagnostic) to the database core, and translate partial indexes for DuckDB without changing their semantics. The bond refuses a foreign-key referential action it cannot reproduce instead of dropping it.

## 1.1.0

### Minor Changes

- Adds `@molecule/api-database-duckdb`, an embedded DuckDB 2.0 database provider for `@molecule/api-database` — an in-process analytical SQL engine that queries Parquet, CSV and JSON files directly (`read_parquet`, `read_csv`, `read_json`) with Postgres-style `$1` placeholders, a FIFO-serialized single connection, the DataStore CRUD layer, and a migration runner that applies the same Postgres-dialect `*.sql` files as the other bonds (`jsonb` → `json` and index `USING <method>` translated; everything else is native).
