---
'@molecule/api-ai-tools': patch
---

`read_file` and `edit_file` no longer report a read that obtained no bytes as a successful read of an empty file: an empty result is checked against the file's real size, retried once when the file has content, and returned as an actionable error when the read genuinely failed or the size could not be confirmed.
