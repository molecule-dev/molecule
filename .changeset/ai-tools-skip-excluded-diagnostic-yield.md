---
'@molecule/api-ai-tools': patch
---

`wait_for_task` no longer returns its one early failure report for a test the request excludes; the wait keeps running and spends it on the first failure that counts.
