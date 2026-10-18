---
'@molecule/app-auth': patch
---

`initialize()` renders a stored token and user as authenticated on the first paint, and `mapAuthResponse` shapes the user on every answer that adopts one, including session validation, cookie restore and token refresh.
