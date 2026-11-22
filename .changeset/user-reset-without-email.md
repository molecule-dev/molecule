---
'@molecule/api-resource-user': patch
'@molecule/api-locales-user': minor
---

Password reset answers 501 `user.error.passwordResetUnavailable` when no email provider is bonded, instead of reporting success.
