---
'@molecule/api-database': patch
---

The docs now state what the standalone `query(sql, values)` resolves to — one plain `{ rows, rowCount, fields? }` object with no `.get()`, `.all()` or `.run()` on it — so a caller written against better-sqlite3's `db.prepare(…).get()` result reads `rows[0]` instead of calling a method that does not exist.
