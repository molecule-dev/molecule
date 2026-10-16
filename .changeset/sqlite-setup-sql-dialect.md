---
'@molecule/api-database-sqlite': patch
---

The README states that a `@molecule/api-resource-*` package's `src/__setup__/*.sql` is Postgres dialect that the migrator translates, so a package's schema should be copied into `api/migrations/` as it is — a hand-written SQLite version of it drifts from the schema the package's own queries expect.
