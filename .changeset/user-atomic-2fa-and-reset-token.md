---
'@molecule/api-resource-user': patch
---

Login 2FA codes, 2FA enable/disable codes and password-reset links are now consumed atomically, so concurrent requests with the same code or link can no longer both succeed.
