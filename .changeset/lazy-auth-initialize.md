---
'@molecule/app-auth': patch
---

A client that was never explicitly initialized restores its session on the first state read, and repeated `initialize()` calls share one request.
