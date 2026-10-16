---
'@molecule/api-ai-tools': patch
---

`wait_for_task` on a task that is still running returns the log's failure lines (up to 40) followed by its end, instead of only the last 3 000 bytes, so a running test suite's failures are no longer hidden below its progress lines.
