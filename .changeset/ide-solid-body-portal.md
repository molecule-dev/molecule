---
'@molecule/app-ide-solid': patch
---

The file-explorer context menu renders through `BodyPortal` and unmounts with its owner, and the dock strip's tray chip and detail portal into the tray elements without a wrapper element.
