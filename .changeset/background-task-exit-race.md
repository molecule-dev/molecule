---
'@molecule/api-ai-tools': patch
---

A background task reports the exit code its wrapper wrote when the task ends, instead of "no exit code", and an empty exit file is never read as success.
