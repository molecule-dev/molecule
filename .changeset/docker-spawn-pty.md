---
'@molecule/api-code-sandbox-docker': minor
---

`spawn()` accepts `pty: { cols, rows }`, creating the exec with a TTY so Ctrl-C interrupts the foreground job, streaming the raw (unmultiplexed) terminal bytes, and exposing `handle.resize({ cols, rows })`.
