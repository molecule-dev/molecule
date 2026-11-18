---
'@molecule/app-ai-chat': patch
---

On repeated server errors the auto-retry waits longer each time (5, 10, 20, then 30 seconds) and shows the error once its attempts run out, instead of retrying every 5 seconds forever.
