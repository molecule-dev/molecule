---
'@molecule/api-resource-user': minor
---

`verifyMiddleware` accepts `{ shouldRefreshSession }`, letting an app skip the transparent token re-issue (and its presence hint) for sessions that must not appear signed in. Defaults to current behaviour.
