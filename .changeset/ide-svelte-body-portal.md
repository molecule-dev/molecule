---
'@molecule/app-ide-svelte': patch
---

The dock strip, the file-explorer context menu and the context-usage view now render their portaled content through `BodyPortal`, so it unmounts with its owner instead of moving nodes or removing the UI kit's portals by hand.
