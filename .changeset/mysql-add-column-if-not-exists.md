---
'@molecule/api-database-mysql': patch
---

A migration's `ALTER TABLE … ADD COLUMN IF NOT EXISTS` is accepted and applied when the column is missing, instead of failing the migration run.
