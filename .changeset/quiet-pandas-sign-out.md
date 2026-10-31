---
'@molecule/app-auth': minor
---

Make local sign-out settle pending restoration and block stale authentication responses, persist `setUser(null)` cleanup, document endpoint-free `logout()`, and keep accepted profile saves ahead of older reads.
