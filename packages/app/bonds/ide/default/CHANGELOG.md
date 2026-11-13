# @molecule/app-ide-default

## 1.1.0

### Minor Changes

- `WorkspaceProvider` gains an optional `getState()` that returns the full workspace state, and the default provider implements it, so a binding that mounts after earlier panel changes reads them at once.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-ide@1.0.1
