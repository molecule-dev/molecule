---
'@molecule/api-database-sqlite': patch
---

A statement that fails now names itself: the error keeps its class and code and carries the one-line SQL in its message and on `sql`, so `datatype mismatch` and `no such table` say which statement hit them. The bound values are never included. `DataStore` queries put the table they were asked for in front of that statement.
