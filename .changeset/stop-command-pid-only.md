---
'@molecule/api-ai-tools': patch
---

`wait_for_task`'s note for a stuck command now hands over the pid-only stop command — `kill <pids>`, or `kill $(cat /tmp/<taskId>.pid)` when the pid walk finds nothing — instead of a `pkill -f <taskId>.sh` chained after it. A `pkill -f` pattern matches the shell running that command as well, so the suggested stop could signal the caller's own shell and leave the run it was meant to stop. The pid tree is what the pattern was for: the detached shell and every process under it. `taskStopCommand` is exported, so every note that hands over a stop command uses this one builder.
