# @molecule/api-project-archive-external-state-motherduck

## 1.1.0

### Minor Changes

- Adds `@molecule/api-project-archive-external-state-motherduck`, the project-archive capture provider for MotherDuck: it exports each configured database with DuckDB `EXPORT DATABASE` (parquet) into the archive and restores it with MotherDuck `CREATE DATABASE IF NOT EXISTS` + `USE` + DuckDB `IMPORT DATABASE`.
