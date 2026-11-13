---
'@molecule/app-ui-react': patch
---

`AuthGuard` renders its children on its own login path, so a guard around the whole route tree no longer redirects in a loop.
