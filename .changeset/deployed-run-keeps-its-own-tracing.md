---
'@molecule/api-ai-tools': patch
---

Leave a run against a deployed URL to its suite's own tracing and retries: a proof run is no longer given `--trace=retain-on-failure`, and a re-run composed from a deployed run carries neither that flag nor `--retries=0`.
