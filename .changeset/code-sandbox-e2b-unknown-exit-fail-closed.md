---
'@molecule/api-code-sandbox-e2b': patch
---

A command whose process is gone while its output stream is still held now reports exit code 137 instead of a fabricated 0, so a killed build fails instead of shipping partial output.
