---
'@molecule/app-auth': patch
---

Auto-refresh schedules nothing when the API issued no refresh token — a cookie-session API no longer signs the user out while their access token is still valid; only an API 401 or an explicit logout ends the session.
