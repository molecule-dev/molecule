---
'@molecule/app-auth': patch
---

Calling `setAccessToken` and `setUser` (in either order) on a signed-out client now signs it in, as `setSession` does.
