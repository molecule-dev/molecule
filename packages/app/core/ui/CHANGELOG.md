# @molecule/app-ui

## 1.1.0

### Minor Changes

- 1f01d1f: Add `UIClassMap.touchTargetCompact` — a 36px coarse-pointer hit-area floor for inline CTAs in dense surfaces (banner/chat-card actions) where the full 44px `touchTarget` is visually heavy; chat notice-card actions with a semantic `color` now use it.

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
