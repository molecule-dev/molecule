---
'@molecule/api-database-sqlite': patch
---

Column reconciliation after a `CREATE TABLE IF NOT EXISTS` now only runs for the migration file that CREATES a table, and never adds a `NOT NULL` column with no default. Before, a rewritten — and then deleted — older migration silently added a column to another file's table, and every insert that did not write it failed.
