---
'@molecule/app-angular': patch
---

`provideMolecule({ i18n })` now stops listening for locale changes when the app is destroyed.
