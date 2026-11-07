---
'@molecule/app-auth': minor
'@molecule/app-react': patch
---

Add payload-first `mapRequestBody(payload, kind)` auth serialization while preserving the legacy `requestBody(kind, payload)` callback. Prefer the one-argument payload adapter in authored examples and hook guidance.
