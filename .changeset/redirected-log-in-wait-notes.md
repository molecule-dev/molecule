---
'@molecule/api-ai-tools': patch
---

`wait_for_task` reads and names the file a background command redirects its output to, and the narrowed re-run it composes writes to a fresh file instead of overwriting that log.
