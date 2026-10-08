---
'@molecule/api-ai-video-generation-kandinsky': patch
---

An error response whose body dies mid-stream still fails as a `KandinskyVideoError` carrying the status, and an MP4 download that dies mid-transfer fails as a typed error with status 0 instead of a raw `TypeError`.
