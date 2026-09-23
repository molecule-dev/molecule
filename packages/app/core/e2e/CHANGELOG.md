# @molecule/app-e2e

## 1.2.0

### Minor Changes

- bff88a8: Adds `e2eRunnerDefaults()`, the Playwright runner settings (workers, parallelism, retries, failure cap, per-test timeout) for the current environment, to spread into `playwright.config.ts`.

## 1.1.0

### Minor Changes

- 76defaf: Inside a molecule sandbox `resolveE2EProviderName()` now picks `playwright` when a Playwright browser is installed there and `preview` only when none is; adds `isMoleculeSandbox()`, `hasInstalledBrowser()` and `playwrightBrowsersPath()`.
