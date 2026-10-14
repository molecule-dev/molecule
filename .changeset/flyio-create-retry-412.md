---
'@molecule/api-code-sandbox-flyio': patch
---

Creating a Machine retries a 412 "volume already claimed" while Fly releases the volume of a Machine that was just destroyed.
