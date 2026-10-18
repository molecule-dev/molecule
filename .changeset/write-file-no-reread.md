---
'@molecule/api-ai-tools': patch
---

`write_file` no longer re-reads a file it just wrote unless an after-write hook may have rewritten it — one fewer sandbox round trip per write, with the same excerpt and line count.
