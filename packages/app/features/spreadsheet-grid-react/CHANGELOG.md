# @molecule/app-spreadsheet-grid-react

## 4.1.0

### Minor Changes

- Render the spreadsheet on web and React Native with two-axis scrolling, range selection, and TSV paste.

## 4.0.4

### Patch Changes

- Copying a selection goes through `@molecule/app-clipboard`, which falls back when the async Clipboard API is unavailable.

## 4.0.3

### Patch Changes

- Require the `@molecule/app-ui` version that has the ClassMap members these components use.

## 4.0.2

### Patch Changes

- Every clickable surface is reachable and operable from the keyboard and named for screen readers, using native buttons and radios where they fit.

## 4.0.1

### Patch Changes

- Feature components style through ClassMap tokens instead of raw class names, so a styling bond swap restyles them too; the Tailwind bond renders the same classes as before.

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
  - @molecule/app-i18n@1.0.1
  - @molecule/app-react@1.0.1
  - @molecule/app-ui@1.0.1
