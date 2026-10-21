---
'@molecule/app-auth': patch
---

`status` now reports `'loading'` only while there is no decision yet, so a login or register request in flight no longer unmounts a page that guards on `'loading'`; progress stays on `state.loading`.
