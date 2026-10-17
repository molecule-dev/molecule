---
'@molecule/api-ai-tools': patch
---

A background suite's output-only filters (`grep`, `tail`, `head`, `cut`, `awk`, `sed`, …) are now dropped from its pipeline, so the log keeps every failure's own error and the reported exit code is the runner's rather than the filter's.
