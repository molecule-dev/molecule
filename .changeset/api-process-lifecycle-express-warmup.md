---
'@molecule/api-process-lifecycle-express': minor
---

Hold readiness closed until the boot warm-up settles and two consecutive probes pass, derive the shutdown flip window from `LB_HEALTHCHECK_INTERVAL_MS`/`LB_HEALTHCHECK_TIMEOUT_MS` (warning once when it is too short), and reap idle keep-alive sockets after a window that runs even when a drain hook fails.
