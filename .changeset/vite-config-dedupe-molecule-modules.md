---
'@molecule/app-vite-config-default': patch
---

Resolves every installed `@molecule/*` package to one module identity, so a provider bonded during startup stays visible to imports that reach the same package through a different install path.
