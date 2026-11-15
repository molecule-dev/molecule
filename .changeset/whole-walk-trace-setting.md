---
'@molecule/api-ai-tools': patch
---

A local Playwright run of the whole suite keeps the suite's own trace setting; only a run that narrows the suite gets `--trace=retain-on-failure` added.
