---
'@molecule/app-react': patch
---

`useAuth()` re-renders when only `status` changes, so a session check that reports `'unavailable'` with an unchanged user is no longer dropped.
