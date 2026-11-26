# @molecule/app-image-gallery-editor-react

## 5.0.0

### Major Changes

- Give `onPickFiles` portable file selections and release browser previews after the gallery stops displaying them.

## 4.0.2

### Patch Changes

- A node prop that renders nothing, such as an empty list, `false` or `''`, renders the same as leaving the prop out.

## 4.0.1

### Patch Changes

- Dropped image files fill the empty slots in order, and the drop zone and every slot are keyboard-operable. The text and each slot's accessible name go through `t()`, with English defaults and per-instance overrides still available.

## 4.0.0

### Patch Changes

- Updated dependencies
  - @molecule/app-react@4.0.0
  - @molecule/app-ui-react@4.0.0

## 3.0.0

### Patch Changes

- Updated dependencies
  - @molecule/app-react@3.0.0
  - @molecule/app-ui-react@3.0.0

## 2.0.0

### Patch Changes

- @molecule/app-react@2.0.0
- @molecule/app-ui-react@2.0.0

## 1.0.3

### Patch Changes

- Confirmations and toggles now use the shared `ConfirmDialog`, `ConfirmButton` and `Switch` from `@molecule/app-ui-react` instead of `window.confirm` and hand-built controls.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-icons@1.0.1
  - @molecule/app-react@1.0.1
  - @molecule/app-ui@1.0.1
  - @molecule/app-ui-react@1.0.1
