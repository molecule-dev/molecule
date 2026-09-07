---
'@molecule/app-vite-config-default': patch
---

Exclude the Playwright `e2e/` suite from vitest collection (`test.exclude`), so `npm test` in an app runs only its unit tests.
