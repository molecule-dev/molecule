---
'@molecule/api-resource-user': patch
---

Document how to reshape a handler's success body: the session token is `result.body.accessToken`, and `props`/`user` are the safe, secret-stripped user fields.
