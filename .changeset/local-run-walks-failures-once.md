---
'@molecule/api-ai-tools': patch
---

A local whole-suite Playwright run gets `--retries=0` (the deployed proof keeps the suite's retries), and a finished run's cause list no longer repeats a proven cause as a shared-duration group.
