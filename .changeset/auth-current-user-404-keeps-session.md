---
'@molecule/app-auth': patch
---

A current-user route that answers 404 no longer signs the user out: `validateSession()` clears the stored session only on 401/403, and a 404 keeps the token and user with an error naming `currentUserEndpoint`.
