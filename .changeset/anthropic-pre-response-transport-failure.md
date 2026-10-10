---
'@molecule/api-ai-anthropic': patch
---

A request that fails before any response arrives (DNS, TLS, a dropped connection, or the provider's own request deadline) now surfaces as the provider's error event instead of a raw transport error.
