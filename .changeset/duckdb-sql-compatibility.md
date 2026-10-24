---
'@molecule/api-database': minor
'@molecule/api-database-duckdb': patch
'@molecule/api-database-motherduck': patch
---

Add the SQL-compatibility type contract (a provider's declared capabilities, a requirement and a diagnostic) to the database core, and translate partial indexes for DuckDB without changing their semantics. The bond refuses a foreign-key referential action it cannot reproduce instead of dropping it.
