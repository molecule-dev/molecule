---
'@molecule/app-http': patch
---

A request the auth gate's own session restore makes is never held by the gate, so a restore that uses the HTTP client no longer deadlocks every page.
