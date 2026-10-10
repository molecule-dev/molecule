---
'@molecule/api-ai-anthropic': patch
---

Cancelling a chat request while it is waiting to retry a rate-limited response now surfaces the caller's own abort, instead of reporting the discarded response as a rate-limit error.
