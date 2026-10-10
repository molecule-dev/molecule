---
'@molecule/api-ai-anthropic': patch
---

A request aborted during a rate-limit backoff, and a non-streaming success body that is not JSON, now yield the sanitized error event instead of throwing a raw TypeError or SyntaxError out of the stream.
