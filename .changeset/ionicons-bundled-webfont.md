---
'@molecule/app-fonts-ionicons': patch
---

The default face resolves to the package's bundled webfont, so `setFont(font)` loads the icons in development and in a production build with no copy into the app.
