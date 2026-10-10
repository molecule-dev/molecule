---
'@molecule/api-code-sandbox-flyio': patch
---

A create whose Machine never reaches the running state now destroys that Machine before failing, so a failed boot no longer leaves a billed Machine behind holding the app's volume.
