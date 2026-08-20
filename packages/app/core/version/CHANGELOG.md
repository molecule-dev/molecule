# @molecule/app-version

## 1.0.2

### Patch Changes

- Apply a pending update by reloading only once the new service worker actually controls the page, instead of on a fixed 100ms timer that could reload onto the old cached build.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-bond@1.0.1
  - @molecule/app-i18n@1.0.1
  - @molecule/app-logger@1.0.1
