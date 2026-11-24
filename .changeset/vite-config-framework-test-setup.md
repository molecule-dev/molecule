---
'@molecule/app-vite-config-default': minor
'@molecule/app-vue': patch
---

The framework vite config runs the vitest setup files each declared `@molecule/*` package names in its package.json (`molecule.vitestSetupFiles`); `@molecule/app-vue` names its event-timing setup, so a Vue app's component tests use it without listing it.
