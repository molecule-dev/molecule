---
'@molecule/app-ide-react': patch
---

The context-usage ring's mount-time restore retries transient failures instead of silently losing the ring for the whole session.
