---
'@molecule/app-ide-panel-logic': patch
---

`autoCommitReducer` returns the same state for a `tick` at zero, so a countdown that keeps ticking there causes no re-render.
