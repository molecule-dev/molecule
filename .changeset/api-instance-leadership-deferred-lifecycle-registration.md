---
'@molecule/api-process-lifecycle': minor
---

Readiness checks, liveness checks and shutdown hooks registered before a provider is bonded are queued and applied when it is, so a bond can register its dependency checks at import time.
