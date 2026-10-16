---
'@molecule/api-database-sqlite': patch
---

Timestamp columns declared with a `DEFAULT now()` / `DEFAULT CURRENT_TIMESTAMP` default now store ISO-8601 UTC values with milliseconds (e.g. `2026-10-16T01:22:21.416Z`) instead of SQLite's space-separated whole-second form, so a stored timestamp parses as the UTC instant it was written and two rows written in the same second sort in insertion order.
