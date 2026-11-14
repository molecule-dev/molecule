---
'@molecule/api-queue-memory': patch
---

A delayed or redelivered message that came due at a millisecond boundary is now delivered instead of waiting for the next queue event.
