---
'@molecule/api-resource-user': patch
---

Account deletion removes the user row first, so a failed delete cannot leave an account without its password.
