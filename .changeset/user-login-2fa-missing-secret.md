---
'@molecule/api-resource-user': patch
---

Login now refuses the request, instead of issuing a session, when two-factor authentication is enabled for an account but no two-factor secret is stored.
