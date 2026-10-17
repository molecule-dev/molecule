---
'@molecule/api-ai-tools': patch
---

The failure-causes recap no longer lists a test the runner counted as `flaky` among the causes to fix: a test that failed once and passed on its retry is named apart, once, so a run whose only reds were retried passes does not send the executor to chase them.
