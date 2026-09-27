---
'@molecule/app-utilities': patch
---

`openUrl` now navigates only to http(s) or relative targets — a `javascript:`, `data:` or other scriptable scheme is refused with a `console.warn` and no navigation.
