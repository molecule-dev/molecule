---
'@molecule/api-database-sqlite': patch
---

A create without an id on a table whose id is `INTEGER PRIMARY KEY` lets SQLite number the row instead of inserting a uuid.
