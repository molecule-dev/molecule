---
'@molecule/api-resource-user': patch
---

Logging in with a password reset link now applies the same one-hour validity gate as the reset confirmation itself (a future-dated timestamp is refused, so the login path is no longer the looser gate for the same credential), and the login analytics event reports the credential that actually authenticated when a request carries both a password and a reset token.
