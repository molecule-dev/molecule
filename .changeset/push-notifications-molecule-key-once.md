---
'@molecule/api-push-notifications-molecule': patch
---

`fetchPublicKey()` asks molecule.dev once and shares the key with later and concurrent calls; the docs serve it through the core's `fetchPublicKey()`.
