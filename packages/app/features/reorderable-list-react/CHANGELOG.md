# @molecule/app-reorderable-list-react

## 4.1.0

### Minor Changes

- Support reordering list rows on React Native by dragging or using accessible move controls.

## 4.0.2

### Patch Changes

- Keyboard reordering now runs from a row's move-up and move-down buttons with Alt+ArrowUp / Alt+ArrowDown, and focus moves to the other button once a move disables the one used. Each row's buttons also announce the item's position, and the list container no longer repeats its implicit list role.

## 4.0.1

### Patch Changes

- Documents the companion locale bond that translates its text.

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

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-react@1.0.1
  - @molecule/app-ui@1.0.1
  - @molecule/app-ui-react@1.0.1
