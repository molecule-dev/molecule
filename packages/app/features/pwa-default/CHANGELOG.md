# @molecule/app-pwa-default

## 1.0.4

### Patch Changes

- 726caa8: The service-worker update banner escapes the localized strings it interpolates into its markup, so a `<`, `&` or quote character in a translated string renders as text instead of becoming markup.

## 1.0.2

### Patch Changes

- 6cad76b: Reload only after the new service worker takes control. Clicking "Update" could previously reload before the waiting worker activated, leaving the old cached bundle in place until another refresh.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-i18n@1.0.1
  - @molecule/app-logger@1.0.1
