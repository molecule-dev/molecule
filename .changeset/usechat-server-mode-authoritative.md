---
'@molecule/app-react': patch
---

`useChat`: the server's persisted mode is applied on every history load and reconnect, including `execute`, so a tab that missed the live plan-to-build switch no longer stays in plan mode.
