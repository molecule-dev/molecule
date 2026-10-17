---
'@molecule/api-ai-tools': patch
---

A diagnosis run's `--trace=retain-on-failure` now goes into the Playwright step itself, so it is still recorded when the command pipes to `tail` or ends in `grep`.
