---
'@molecule/app-auth': minor
---

`AuthClientConfig.shouldRestoreUser` lets an app reject a cookie-restored user and clear the stale presence hint, so an anonymous session cannot hydrate as a blank signed-in user. Defaults to current behaviour.
