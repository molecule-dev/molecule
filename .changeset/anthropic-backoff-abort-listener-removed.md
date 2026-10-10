---
'@molecule/api-ai-anthropic': patch
---

The retry backoff now removes its abort listener when the wait completes, so a caller signal reused across turns no longer accumulates a listener per rate-limited retry.
