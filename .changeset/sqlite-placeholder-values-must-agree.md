---
'@molecule/api-database-sqlite': patch
---

`convertPlaceholders` refuses a statement whose `$N` placeholders and supplied values disagree — a value that no placeholder names, or a placeholder with no value — instead of dropping the value (or binding `NULL`) in silence and returning the wrong rows. The error names the placeholder and the statement, matching the contract PostgreSQL enforces at bind time.
