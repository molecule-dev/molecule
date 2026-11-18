---
'@molecule/app-feature-canvas-react': patch
---

`useCanvasViewport` and `useCanvasSelection` seed their state from the first render's `initial` without reading a ref during render.
