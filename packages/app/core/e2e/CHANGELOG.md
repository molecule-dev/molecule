# @molecule/app-e2e

## 1.2.1

### Patch Changes

- 2cfb7f4: Inside a molecule sandbox with a browser, end-to-end runs use two workers instead of half the cores (one on a 2-vCPU sandbox).

## 1.2.0

### Minor Changes

- bff88a8: Adds `e2eRunnerDefaults()`, the Playwright runner settings (workers, parallelism, retries, failure cap, per-test timeout) for the current environment, to spread into `playwright.config.ts`.

## 1.1.0

### Minor Changes

- 76defaf: Inside a molecule sandbox `resolveE2EProviderName()` now picks `playwright` when a Playwright browser is installed there and `preview` only when none is; adds `isMoleculeSandbox()`, `hasInstalledBrowser()` and `playwrightBrowsersPath()`.
