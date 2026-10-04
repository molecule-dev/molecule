---
'@molecule/api-oauth-github': patch
---

Capture the user's actual email: verify() now reads `GET /user/emails` (the `user:email` scope it always requested) and returns the primary verified address, instead of only the public profile email — which is null for most users, so accounts were created with no email at all. Falls back to the public email when the endpoint is unavailable; a failed lookup never fails the login.
