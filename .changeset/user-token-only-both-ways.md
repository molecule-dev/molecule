---
'@molecule/api-resource-user': patch
---

`verifyMiddleware({ allowCookieSession: false })` now turns the session cookie off in both directions: `set()` no longer writes the `token` / `sessionId` / `mol_auth` cookies for a token-only request, and a token-only mount drops a session an earlier, laxer mount resolved from the cookie (a header-resolved session is untouched).
