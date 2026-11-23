---
'@molecule/app-ui-angular': minor
---

Components that render without a host element need `provideDomPlacement()` from `@molecule/app-angular` in the application's providers (`provideMolecule()` includes it), and name it in their error when it is missing.
