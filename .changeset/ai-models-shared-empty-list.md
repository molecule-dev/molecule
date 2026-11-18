---
'@molecule/app-react': patch
'@molecule/app-vue': patch
'@molecule/app-solid': patch
'@molecule/app-svelte': patch
'@molecule/app-angular': patch
---

`useAIModels` returns one empty `models` list, shared by every caller, while the catalog loads or after a failed fetch.
