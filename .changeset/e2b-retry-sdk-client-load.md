---
'@molecule/api-code-sandbox-e2b': patch
---

Retry loading the E2B SDK client after a failed load instead of caching the failure for the life of the process.
