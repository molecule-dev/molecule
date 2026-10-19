---
'@molecule/api-server-default-express': minor
---

Readiness now answers 503 until the boot warm-up settles and two consecutive probes pass, so a rolling deploy does not route to a still-warming instance.
