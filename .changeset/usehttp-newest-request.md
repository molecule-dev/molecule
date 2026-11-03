---
'@molecule/app-react': patch
---

`useHttp` and its method hooks show only the newest request's answer, so an older response that arrives late no longer replaces newer data or clears `loading` early.
