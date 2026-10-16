---
'@molecule/api-database-sqlite': patch
---

A migration's `ALTER TABLE … ADD COLUMN IF NOT EXISTS` is applied only when the column is missing, instead of failing the whole file and warning about it on every boot.
