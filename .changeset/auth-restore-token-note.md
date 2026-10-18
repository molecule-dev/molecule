---
'@molecule/app-auth': patch
---

Document the token wiring a separately created HTTP client needs after the session restore: `createDefaultHttpClientWithAuthBearer` plus `setAuthGate(() => authClient.whenRestored())`.
