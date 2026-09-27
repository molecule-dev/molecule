---
'@molecule/api-ai-tools': patch
---

The background-run guidance now points at `wait_for_task` (or `exec_command` with `tail`) for a task's log output — the previous text suggested `read_file`, which cannot reach `/tmp` under the default path guards, so the read always failed.
