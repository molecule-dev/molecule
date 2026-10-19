---
'@molecule/api-ai-tools': patch
---

`edit_file` now refuses a call that supplies both a `replacements` batch and the top-level `old_string`/`new_string` pair instead of applying the batch and silently discarding the pair; the tool schema documents the two forms as mutually exclusive.
