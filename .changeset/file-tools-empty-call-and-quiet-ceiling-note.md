---
'@molecule/api-ai-tools': patch
---

`read_file`, `write_file` and `edit_file` called with no arguments at all now answer that the call arrived empty and was probably truncated, instead of asking for a `path` the caller never had a chance to send. The exec_command note about a requested timeout above the tool's ceiling is attached only when the command actually came near that ceiling.
