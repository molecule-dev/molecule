# @molecule/app-feature-chapter-list-react

## 4.1.0

### Minor Changes

- Render with the renderer-neutral elements, so the component also renders on React Native; it peers on `@molecule/app-ui-react` 4.4.

## 4.0.1

### Patch Changes

- Every clickable surface is reachable and operable from the keyboard and named for screen readers, using native buttons and radios where they fit.

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

## 1.0.3

### Patch Changes

- 04d3f3b: Every labelled button renders through `cm.button()`; none is hand-styled. Visual parity with the design system, no API change.

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
