---
'@molecule/app-ai-chat-http': minor
---

Sends Last-Event-ID on a resume and retries a resume answered 502/503/504 with backoff, so a dropped stream survives a rolling restart; a fresh send is never retried.
