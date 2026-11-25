# @molecule/app-heatmap-react

## 4.1.0

### Minor Changes

- Renders the heatmap through shared SVG elements with accessible cells and pointing-device hover. Requires `@molecule/app-ui-react` 4.7.0 and `@molecule/app-ui` 1.9.0.

## 4.0.1

### Patch Changes

- The grid is announced as one labelled group, and its month and weekday labels are hidden from screen readers. A clickable cell is now a button that activates with Enter or Space, while a non-clickable cell is an image with no tab stop.

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
