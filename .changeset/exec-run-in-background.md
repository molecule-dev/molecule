---
'@molecule/api-ai-tools': minor
---

`exec_command` accepts `run_in_background`: the command is detached and the tool returns a task id, a log path and an exit-code path immediately, so a long test suite or build no longer has to fit inside the command timeout.
