---
'@molecule/api-ai-tools': patch
---

The environment-dump guard reads command position, so a `|` inside a quoted grep pattern is no longer blocked as a pipe, and a command that reads a run's log is no longer reported as a suite stopped by a process kill.
