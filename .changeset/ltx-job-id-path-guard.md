---
'@molecule/api-ai-video-generation-ltx': patch
---

`getStatus()` rejects job ids whose tail contains dot segments (literal or percent-encoded), empty, `?` or `#` segments, and percent-encodes each tail segment when building the poll URL. A 2xx response with a non-JSON body fails as an `LtxVideoError` instead of a raw `SyntaxError`.
