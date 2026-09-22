---
'@molecule/api-ai-tools': minor
---

`read_file` takes `offset`/`limit` to return a line window (a negative `offset` counts from the end, like `tail`), and `search_files` takes `contextLines` to return surrounding lines like `grep -C`. Both report their position so the next window can be requested.
