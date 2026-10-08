---
'@molecule/api-ai-video-generation-ltx': patch
---

`getStatus()` rejects job ids whose tail contains path-traversal (`.`/`..`), empty, `?` or `#` segments instead of interpolating them into the poll URL.
