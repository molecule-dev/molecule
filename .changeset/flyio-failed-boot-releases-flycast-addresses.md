---
'@molecule/api-code-sandbox-flyio': patch
---

A sandbox boot that fails while allocating its Flycast private routes now releases the addresses it had already allocated, instead of leaving them behind on the target apps.
