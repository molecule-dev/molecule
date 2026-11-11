---
'@molecule/api-resource-user': patch
---

Document that `verifyMiddleware` never answers a request itself: one it cannot authenticate continues without a session.
