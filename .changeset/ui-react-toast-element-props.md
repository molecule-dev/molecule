---
'@molecule/app-ui-react': patch
---

`Toast` passes a caller's `id` and other element props to its root, and `useToast().addToast` keeps an `id` the caller gives.
