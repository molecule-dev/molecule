---
'@molecule/api-database-motherduck': minor
---

Adds `@molecule/api-database-motherduck`, a MotherDuck (hosted DuckDB) database provider for `@molecule/api-database` — the same DuckDB SQL and DataStore as the duckdb bond, reached through an `md:` connection string with `MOTHERDUCK_TOKEN`, instance caching (`DuckDBInstance.fromCache`) per MotherDuck's guidance, and the same migration runner on the remote database.
