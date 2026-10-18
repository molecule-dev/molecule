---
'@molecule/api-ai-tools': patch
---

`wait_for_task` marks a finished result `status: 'completed'`, so a caller can tell the delivered result apart from a progress return when the run's exit code is withheld.
