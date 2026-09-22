# @molecule/app-e2e

## 1.1.0

### Minor Changes

- 76defaf: Inside a molecule sandbox `resolveE2EProviderName()` now picks `playwright` when a Playwright browser is installed there and `preview` only when none is; adds `isMoleculeSandbox()`, `hasInstalledBrowser()` and `playwrightBrowsersPath()`.
