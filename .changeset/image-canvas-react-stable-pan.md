---
'@molecule/app-feature-image-canvas-react': patch
---

The pan offset keeps one object per position, so the canvas callbacks that read it no longer change identity on every render.
