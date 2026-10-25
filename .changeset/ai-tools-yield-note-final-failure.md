---
'@molecule/api-ai-tools': patch
---

`wait_for_task`'s one-time diagnostic return for a deployed run now says the failing test is on its final attempt, so the run will not pass, and to start reading the failing spec and fixing it while the run keeps walking — nothing is sent against the app until the run ends, and its final result is still collected with `wait_for_task`.
