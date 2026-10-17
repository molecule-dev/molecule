---
'@molecule/app-auth': patch
---

`@molecule/app-auth` documents how to wire it by hand in a scaffolded app (`createJWTAuthClient`/`setClient`, `initialize()`, `MoleculeProvider`/`useAuth()`) and why a hand-rolled token store races the session restore.
