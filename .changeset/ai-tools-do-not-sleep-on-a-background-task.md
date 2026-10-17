---
'@molecule/api-ai-tools': patch
---

`exec_command` no longer blocks on a leading `sleep N` while a background task can answer it: the task's state, progress and failures so far come back at once, and the start and wait notes name `wait_for_task` instead of a hand `tail`.
