---
'@molecule/api-code-sandbox-flyio': patch
---

`start()`/`wake()` on a Machine that is still booting now waits until it is running instead of resolving early, so the first command after the call no longer fails with "machine not running".
