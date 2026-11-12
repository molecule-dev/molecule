---
'@molecule/api-ai-tools': patch
---

Playwright feedback reports a spec whose every test skips itself as `skipped`, and `check({ failedOnly: true })` re-runs only known native failures.
