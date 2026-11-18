---
'@molecule/app-map-drawing-react': patch
---

A controlled `activeTool` change discards the in-progress draft in the same render as the switch instead of one render later.
