---
'@molecule/api-code-sandbox-flyio': minor
---

`verifyEgress()` now reads the app's network policy back from Fly, so the verdict names every allowed port as reachable to any host — a Fly policy matches protocol and port with no destination — and reports `open` when the policy in force allows a port this provider never configured. Adds `reconcileEgressPolicy(app)`, which re-applies the current policy to an app that already exists.
