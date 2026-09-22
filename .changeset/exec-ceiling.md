---
'@molecule/api-ai-tools': patch
---

`exec_command` refuses, without running, a command that declares a longer budget than the tool's ceiling *and* pipes its output into `tail`/`grep` — that combination can only spend the whole budget and return nothing. A command that declares no budget, or whose partial output would survive, still runs as before.
