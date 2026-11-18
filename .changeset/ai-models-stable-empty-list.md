---
'@molecule/app-react': patch
'@molecule/app-vue': patch
'@molecule/app-solid': patch
'@molecule/app-svelte': patch
'@molecule/app-angular': patch
---

`useAIModels` returns the same empty `models` list while the catalog loads or after a failed fetch, so its identity changes only with the catalog.
