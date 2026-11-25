---
'@molecule/api-server-default-express': patch
---

The server attaches a bonded realtime provider created with `deferAttach: true` to the API's HTTP server before it listens, so bond setup needs no server-created hook.
