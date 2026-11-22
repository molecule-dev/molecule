---
'@molecule/api-resource-user': minor
---

The session cookie no longer authenticates a write that another site started; `verifyMiddleware({ trustedOrigins })` and `APP_ORIGIN` list origins that may.
