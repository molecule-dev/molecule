---
'@molecule/api-ai-tools': minor
---

Read a failed Playwright run's own `trace.zip` files, and hand the platform what they say: `parseTraceArtifacts` (with `traceArtifactsScript`, a dependency-free in-sandbox reader) returns each failing test's last requests with their statuses and its console errors, and `failureTraceNote` writes them as a bounded note — so a click that changed nothing is answered by `POST /api/articles/x/favorite → 401` instead of by hand-written browser probes. `diagnosisTraceCommand` adds `--trace=retain-on-failure` to a run narrowed to a part of the suite when the config it reads records traces for no failure (`suiteRecordsTraces`), never to the whole-suite proof run.
