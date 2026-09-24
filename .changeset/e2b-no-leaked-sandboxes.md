---
'@molecule/api-code-sandbox-e2b': patch
---

`create()` destroys the sandbox when its egress policy fails to apply, and `verifyEgress()` retries destroying its probe sandbox and reports one it could not remove.
