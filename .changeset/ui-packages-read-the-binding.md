---
'@molecule/app-ui-vue': patch
'@molecule/app-ui-solid': patch
---

Components read auth, routing, theme and translation through the framework binding (`@molecule/app-vue`, `@molecule/app-solid`) instead of a private copy of its accessors, so the binding's translated errors and fixes apply to them.
