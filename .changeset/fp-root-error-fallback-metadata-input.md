---
'@molecule/app-root-error-boundary-angular': patch
---

The boundary's fallback receives the caught error in JIT-compiled builds too, so it logs the error there as well.
