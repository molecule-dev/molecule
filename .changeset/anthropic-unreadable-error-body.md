---
'@molecule/api-ai-anthropic': patch
---

An error response whose body cannot be read now yields the same sanitized error event as every other API failure instead of throwing out of the stream.
