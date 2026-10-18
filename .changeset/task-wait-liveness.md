---
'@molecule/api-ai-tools': patch
---

A background task is only reported as running while its process is alive: a wait returns the run's own result once its output records the ending, and a sleep is never held for a task that has ended.
