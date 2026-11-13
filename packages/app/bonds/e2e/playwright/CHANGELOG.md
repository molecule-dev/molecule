# @molecule/app-e2e-playwright

## 1.0.4

### Patch Changes

- Rejections that were discarded silently are now logged, or kept as commented no-ops where ignoring them is correct.

## 1.0.2

### Patch Changes

- 76defaf: Documents the bond as the one a molecule sandbox uses (the sandbox image ships Chromium under `PLAYWRIGHT_BROWSERS_PATH`); the missing-browser error now says so instead of pointing at the preview bond.
