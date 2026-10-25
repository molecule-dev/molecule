---
'@molecule/api-code-sandbox-flyio': patch
---

`importFiles` now compresses the archive on the thread pool, so a server hosting this provider keeps answering requests while a large archive is imported.
