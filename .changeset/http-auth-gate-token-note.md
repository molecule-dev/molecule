---
'@molecule/app-http': patch
---

Document that waiting for the session restore does not attach the token: a client created beside the auth bond needs `createDefaultHttpClientWithAuthBearer` plus `setAuthGate`.
