---
'@molecule/api-code-sandbox-e2b': minor
---

Adds `spawn()` — a long-running process with streaming stdout/stderr, writable stdin and `kill()`, plus `pty: { cols, rows }` for a real terminal where Ctrl-C interrupts the foreground job and `resize()` renegotiates the width. `exec()` now starts every command in the background and waits on its handle, so a launch that leaves a detached child behind returns its real exit code immediately instead of blocking until the deadline, and a command ending in `&` reports its actual output and exit code instead of a fabricated success.
