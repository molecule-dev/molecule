---
'@molecule/api-code-sandbox-e2b': patch
---

`exec()` no longer blocks for its whole timeout when a command leaves something behind holding its output stream — a detached supervisor, a daemon that keeps its descriptors. It now checks whether the started process is still running and returns as soon as the command itself is over.
