---
'@molecule/api-ai-anthropic': patch
---

The retry backoff no longer waits when the request was already aborted, so a cancelled request returns its error immediately instead of after the delay.
