# @molecule/app-push

## 1.2.1

### Patch Changes

- `@molecule/app-pwa-default` is an optional peer of `@molecule/app-push`, so an app that never sends web push installs no service worker toolchain, and the missing-worker error names the package to add.

## 1.2.0

### Minor Changes

- Requires `@molecule/app-pwa-default`, whose service worker web push registers with and delivers through.

## 1.1.0

### Minor Changes

- Turn push notifications on or off for the current device with `enablePushOnCurrentDevice`, `disablePushOnCurrentDevice` and `readCurrentDevicePushEnabled`, which run the permission, registration and device-API chain and return a typed result.

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
