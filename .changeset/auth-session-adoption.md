---
'@molecule/app-auth': patch
---

`setSession({ accessToken, user })` adopts a session an exchange outside the client already established, and a session check that returns an unchanged user no longer notifies subscribers or replaces the user object.
