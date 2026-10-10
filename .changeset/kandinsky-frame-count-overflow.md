---
'@molecule/api-ai-video-generation-kandinsky': patch
---

A clip duration whose frame count overflows the finite range is now refused before the request is sent, instead of sending a non-numeric frame count to the server.
