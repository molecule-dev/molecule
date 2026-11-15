---
'@molecule/app-bonds-default': minor
'@molecule/app-bonds-default-vue': minor
'@molecule/app-bonds-default-solid': minor
'@molecule/app-bonds-default-svelte': minor
'@molecule/app-bonds-default-angular': minor
'@molecule/app-bonds-default-react': patch
---

Add `@molecule/app-bonds-default`, the framework-neutral default bond wirings, and its Vue, Solid, Svelte and Angular packages with the same exports as `@molecule/app-bonds-default-react` (`setupAllDefaultBonds`, `bootstrapApp`, the `./optional/*` setups); the React package re-exports the neutral half, so its exports are unchanged.
