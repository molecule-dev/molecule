---
'@molecule/api-ai-tools': minor
---

New `wait_for_task` tool: waits for a command started with `run_in_background` and returns its output and exit code in one call, so an executor that needs the result no longer has to sleep and re-read the log.
