---
'@molecule/app-ide-react': patch
---

The added/removed line count on an edit card now keeps the order of the lines in view when a replacement is too large for the exact diff, so a big reordering shows its line changes instead of `+0 −0`.
