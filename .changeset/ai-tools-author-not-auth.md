---
'@molecule/api-ai-tools': patch
---

Secret redaction no longer masks `author=…` values; `AUTH*` and `authorization` values are still masked.
