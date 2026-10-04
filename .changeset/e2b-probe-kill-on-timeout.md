---
'@molecule/api-code-sandbox-e2b': patch
---

The `verifyEgress()` probe sandbox is now created to be killed at its deadline instead of paused, so a leaked probe never leaves a snapshot on the host.
