---
'@molecule/app-react': patch
'@molecule/app-solid': patch
'@molecule/app-vue': patch
---

Clarify that cached JWT tokens and user profiles restore synchronously without a request. Only token-only and cookie-only sessions need an asynchronous current-user request before their first session decision.
