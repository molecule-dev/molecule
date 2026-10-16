---
'@molecule/api-ai-tools': patch
---

`wait_for_task`'s note for a stuck command now hands over the pid-only stop command — `kill <pids>`, or `kill $(cat /tmp/<taskId>.pid)` when the pid walk finds nothing — instead of a `kill $(cat …pid); pkill -f <taskId>.sh` pair. A `pkill -f` pattern matches the shell running the command as well, so the command the platform itself suggested could be refused by the platform's own pattern-kill guard, and the executor was left with a run it could not stop. The pid tree is what the pattern was for: the detached shell and every process under it. `taskStopCommand` is exported, so every note that hands over a stop command uses this one builder.
