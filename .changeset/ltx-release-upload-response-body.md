---
'@molecule/api-ai-video-generation-ltx': patch
---

The upload response body is released after a successful upload, so the connection returns to the pool instead of waiting for garbage collection.
