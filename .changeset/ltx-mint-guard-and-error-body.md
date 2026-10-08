---
'@molecule/api-ai-video-generation-ltx': patch
---

`generate()` refuses a job id it could never poll back (dot segments, empty segments, `?` or `#`) instead of minting a handle `getStatus()` rejects, and an error response whose body dies mid-stream still fails as an `LtxVideoError` carrying the status instead of a raw `TypeError`.
