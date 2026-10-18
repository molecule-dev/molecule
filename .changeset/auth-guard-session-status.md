---
'@molecule/app-ui-react': patch
---

`AuthGuard` renders from the session status, so a restored session paints immediately instead of waiting for a background verification.
