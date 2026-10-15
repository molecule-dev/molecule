---
'@molecule/api-database-sqlite': patch
---

Migrations translate `ADD COLUMN IF NOT EXISTS` to `ADD COLUMN`, which SQLite can run.
