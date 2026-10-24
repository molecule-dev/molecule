# @molecule/api-database-duckdb

## 1.1.0

### Minor Changes

- Adds `@molecule/api-database-duckdb`, an embedded DuckDB 2.0 database provider for `@molecule/api-database` — an in-process analytical SQL engine that queries Parquet, CSV and JSON files directly (`read_parquet`, `read_csv`, `read_json`) with Postgres-style `$1` placeholders, a FIFO-serialized single connection, the DataStore CRUD layer, and a migration runner that applies the same Postgres-dialect `*.sql` files as the other bonds (`jsonb` → `json` and index `USING <method>` translated; everything else is native).
