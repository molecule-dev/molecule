---
'@molecule/api-code-sandbox-flyio': patch
---

`destroy()` now reports a failed machine or app delete instead of swallowing it, so a caller can retry; a 404 still counts as already gone.
