---
'@molecule/app-feature-animation-canvas-react': patch
'@molecule/app-locales-feature-animation-canvas': patch
---

Only the canvas root carries an accessible name: the shape groups inside its `role="img"` drop their unexposed `aria-label`, and the bond drops its `animationCanvas.aria.shape` key.
