---
'@molecule/api-ai-tools': patch
---

`read_file` returns at most ~80 KB per file when no window is asked for — the first window plus a note on how to read the rest — instead of a whole multi-megabyte file; a batched read is bounded to ~200 KB.
