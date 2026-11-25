# @molecule/app-feature-piano-roll-react

## 4.1.0

### Minor Changes

- Renders PianoRoll on web and React Native with tap-to-paint, note dragging, and edge resizing. Requires `@molecule/app-ui-react` 4.7.0 and `@molecule/app-ui` 1.9.0.

## 4.0.2

### Patch Changes

- Describe the grid's keyboard controls to screen readers, and mint a note's id only when it is painted.

## 4.0.1

### Patch Changes

- Keyboard and screen-reader access for canvas nodes, annotation pins, map drawing, the piano roll and margin notes, with translated labels.

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
