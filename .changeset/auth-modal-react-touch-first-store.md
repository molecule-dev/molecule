---
'@molecule/app-auth-modal-react': patch
---

The touch-first viewport check reads `matchMedia` through `useSyncExternalStore` instead of copying it into state from an effect.
