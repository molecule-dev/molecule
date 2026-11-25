# @molecule/app-feature-animation-canvas-react

## 4.1.0

### Minor Changes

- Renders AnimationCanvas on web and React Native with contact-to-seek support. Requires `@molecule/app-ui-react` 4.7.0 and `@molecule/app-ui` 1.9.0.

## 4.0.1

### Patch Changes

- Only the canvas root carries an accessible name: the shape groups inside its `role="img"` drop their unexposed `aria-label`, and the bond drops its `animationCanvas.aria.shape` key.

## 4.0.0

### Patch Changes

- Updated dependencies
  - @molecule/app-react@4.0.0

## 3.0.0

### Patch Changes

- Updated dependencies
  - @molecule/app-react@3.0.0

## 2.0.0

### Patch Changes

- @molecule/app-react@2.0.0

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
