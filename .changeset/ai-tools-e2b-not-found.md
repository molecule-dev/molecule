---
'@molecule/api-ai-tools': patch
---

`read_file` and `list_files` give the parent-directory hint for E2B's not-found wording too, and the path-safety check retries once and names a failure that is not a timeout.
