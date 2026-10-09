---
'@molecule/api-code-sandbox-e2b': patch
---

A failed `importFiles` spool/extract or `exportFiles` archive create now fails with the failing stage's name and the command's stderr instead of the SDK's bare "exit status N" error.
