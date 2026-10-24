# @molecule/api-project-archive-external-state-duckdb

## 1.1.0

### Minor Changes

- Adds `@molecule/api-project-archive-external-state-duckdb`, the project-archive capture provider for embedded DuckDB: it byte-copies a project's configured `.duckdb` files and their `.wal` siblings into the archive and writes them back on restore, so a project archive cannot verify clean while its database is destroyed.
