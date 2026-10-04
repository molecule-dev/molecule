---
'@molecule/app-ai-chat-http': patch
---

Resume sends (`resume: true`) now carry `Accept: text/event-stream`, so a server that is still streaming the turn can attach the request to the live stream (the `attached` frame) instead of refusing with 409 once the retry backoff runs out. New sends deliberately keep the 409-retry path — attaching never reads the request body, so a new message must serialize behind the running turn.
