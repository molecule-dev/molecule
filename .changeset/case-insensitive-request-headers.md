---
'@molecule/app-http': patch
---

Merge request headers case-insensitively, so a caller's lower-case header no longer produces a duplicated Content-Type or Authorization value.
