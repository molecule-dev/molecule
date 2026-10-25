---
'@molecule/api-ai-tools': patch
---

`wait_for_task`'s one-time failure diagnostic now yields only for a failure the run has finished with, so a first attempt whose retry is still pending no longer reads as a failure.
