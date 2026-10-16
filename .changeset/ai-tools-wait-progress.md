---
'@molecule/api-ai-tools': patch
---

`wait_for_task` on a task that is still running now says how long it has been running, how far its own log says it has got (when the log carries a `[done/total]` counter) and how much longer that implies, so waiting on a suite that outlasts one call is not blind.
