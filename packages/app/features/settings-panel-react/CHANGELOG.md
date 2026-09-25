# @molecule/app-settings-panel-react

## 1.0.4

### Patch Changes

- Confirmations and toggles now use the shared `ConfirmDialog`, `ConfirmButton` and `Switch` from `@molecule/app-ui-react` instead of `window.confirm` and hand-built controls.

## 1.0.3

### Patch Changes

- The push-notifications switch has an accessible name.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-auth@1.0.1
  - @molecule/app-react@1.0.1
  - @molecule/app-ui@1.0.1
  - @molecule/app-ui-react@1.0.1
