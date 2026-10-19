---
'@molecule/api-process-lifecycle-express': minor
---

First release of the Express/Node process-lifecycle provider: `GET /health/live` and `GET /health/ready`, `Connection: close` on responses while draining, and SIGTERM/SIGINT graceful shutdown that drains in-flight requests and exits 0.
