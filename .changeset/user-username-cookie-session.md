---
'@molecule/api-resource-user': minor
'@molecule/api-locales-user': minor
---

Usernames are stored as sent or refused (letters, digits, `.`, `-`, `_`), a body nested under `user` gets its own error, `verifyMiddleware({ allowCookieSession: false })` makes an API token-only, and `utilities.stripSensitiveUserColumns` is exported.
