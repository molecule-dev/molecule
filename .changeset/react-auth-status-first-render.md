---
'@molecule/app-react': patch
---

`useAuth()` returns `status` directly, so a guard or page reads the session state without unpacking `state`.
