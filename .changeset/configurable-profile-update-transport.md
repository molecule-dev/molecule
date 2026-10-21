---
'@molecule/app-auth': minor
---

`updateProfile()` accepts a configurable HTTP method and request body envelope, so an API whose profile route is `PUT /api/user` taking `{ user }` uses the shared client instead of a hand-written one; the default stays `PATCH` with the bare profile.
