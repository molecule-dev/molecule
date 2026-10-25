---
'@molecule/api-ai-tools': patch
---

`exec_command` runs a command whose `cwd` is outside the workspace when the command already starts with `cd` into that same directory, and an outside `cwd` that is still refused is told to leave the `cwd` parameter unset.
