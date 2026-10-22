---
'@molecule/api-ai-tools': patch
---

`runningLogReadCommand` (and the `registeredTaskLogCommand` handle it resolves) read a running task's log as one contiguous, size-marked window, so a diagnostic note is never built from the stitched `outputSoFar` display.
