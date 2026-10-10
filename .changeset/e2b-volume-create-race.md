---
'@molecule/api-code-sandbox-e2b': patch
---

Creating a named volume is idempotent across concurrent boots: a create that loses the race to another boot now reports success once the volume exists, instead of failing the boot.
