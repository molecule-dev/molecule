---
'@molecule/api-ai-anthropic': patch
---

A streaming response body that dies mid-stream (connection reset, proxy cut, or the default timeout firing) now yields the sanitized error event instead of throwing a raw TypeError or TimeoutError out of the stream. A caller's own abort still propagates as before.
