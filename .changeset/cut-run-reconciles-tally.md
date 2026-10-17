---
'@molecule/api-ai-tools': patch
---

A test run's closing summary now counts as finished only when it reconciles with the total the runner announced, so a run stopped part-way is reported as stopped (with how many tests it never reached) instead of handing back `exitCode: 0`; detection reads the run's untruncated output.
