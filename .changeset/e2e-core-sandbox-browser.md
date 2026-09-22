---
'@molecule/app-e2e': minor
---

Inside a molecule sandbox `resolveE2EProviderName()` now picks `playwright` when a Playwright browser is installed there and `preview` only when none is; adds `isMoleculeSandbox()`, `hasInstalledBrowser()` and `playwrightBrowsersPath()`.
