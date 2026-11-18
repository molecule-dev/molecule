---
'@molecule/app-rating-display-react': patch
---

Each star keeps the gradient id it was given when it mounted instead of drawing a new one on every render.
