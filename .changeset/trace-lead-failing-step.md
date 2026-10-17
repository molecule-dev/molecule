---
'@molecule/api-ai-tools': patch
---

The failure-trace note now leads each failing test's row with the request the failing step itself sent and its response body, and the reader exposes that request as `TraceArtifact.lead`.
