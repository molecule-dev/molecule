---
'@molecule/app-spreadsheet-grid-react': patch
---

Copying a selection goes through `@molecule/app-clipboard`, which falls back when the async Clipboard API is unavailable.
