---
'@molecule/api-ai-tools': patch
---

A trace row whose failing click got a 4xx from the logout endpoint and left the page on the same URL says the auth client ignores that error and the page has to navigate itself after `logout()`.
