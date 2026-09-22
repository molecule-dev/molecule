---
'@molecule/api-ai-tools': patch
---

`edit_file` now finds a block whose `old_string` differs from the file only in spacing next to punctuation (a missing space after a comma, for example), as it already did for indentation; uniqueness is still required and the replacement is applied verbatim.
