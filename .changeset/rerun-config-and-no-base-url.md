---
'@molecule/api-ai-tools': minor
---

`scopedRerunCommand`/`rerunOfRunningSuite` carry the `--config` a run was measured under, and a finished run whose failures are all `Cannot navigate to invalid URL` is reported as one configuration failure naming that config and the exact command, instead of a list of causes.
