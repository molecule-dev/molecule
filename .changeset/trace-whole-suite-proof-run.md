---
'@molecule/api-ai-tools': patch
---

Add `--trace=retain-on-failure` to whole-suite Playwright runs whose config records no trace, so a failing proof run leaves a trace its failures can be read from.
