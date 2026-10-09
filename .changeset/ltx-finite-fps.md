---
'@molecule/api-ai-video-generation-ltx': patch
---

A non-finite `fps` is refused with a 400 `LtxVideoError` before the submit, instead of being serialized to JSON `null`.
