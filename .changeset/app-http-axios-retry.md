---
'@molecule/app-http-axios': minor
---

Retries idempotent requests twice on 502/503/504 or a reset connection, with jittered backoff and Retry-After; a POST/PATCH is repeated only with an Idempotency-Key.
