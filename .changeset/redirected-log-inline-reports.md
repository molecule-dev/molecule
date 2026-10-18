---
'@molecule/api-ai-tools': patch
---

`wait_for_task` promises inline failure reports only for a background suite run that was actually put on the inline-failure switch, and a suite run whose output is redirected to a file and followed by a status echo is rewritten like any other run.
