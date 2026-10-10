---
'@molecule/api-ai-anthropic': patch
---

Rate-limited and overloaded responses are now released before a retry, so sustained 429/529 handling no longer holds connections open until garbage collection.
