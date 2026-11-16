---
'@molecule/app-secret-row-react': minor
'@molecule/app-secret-row-vue': minor
'@molecule/app-secret-row-solid': minor
'@molecule/app-secret-row-svelte': minor
'@molecule/app-secret-row-angular': minor
---

Copy through `@molecule/app-clipboard`, now a peer dependency, so copying works where the Clipboard API is missing or refuses, and the copied state shows only after a successful copy. The expired tag uses the theme error tone, which needs `@molecule/app-ui` 1.4.0.
