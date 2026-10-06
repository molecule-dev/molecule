---
'@molecule/api-reporting-database': patch
---

CSV exports now prefix cells that start with `=`, `+`, `-`, `@`, a tab or a carriage return with a single quote so spreadsheets read them as text, and quote cells containing carriage returns.
