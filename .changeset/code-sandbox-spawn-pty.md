---
'@molecule/api-code-sandbox': minor
---

`spawn()` now takes `SpawnOptions`, which adds `pty: { cols, rows }` for a process with a real controlling terminal, and `SpawnHandle` gains an optional `resize({ cols, rows })` for it. Providers that cannot allocate a PTY must reject the spawn rather than return pipes, so a caller can feature-detect a terminal.
