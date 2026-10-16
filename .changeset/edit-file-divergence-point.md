---
'@molecule/api-ai-tools': patch
---

`edit_file` reports where a not-found `old_string` stops matching the file — the diverging line, both versions of it, and the file from that point — instead of showing nearby lines the caller already matched.
