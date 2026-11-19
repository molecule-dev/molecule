# @molecule/app-admin-table-react

## 4.0.4

### Patch Changes

- Each row's select checkbox, the select and actions column headers and the row-actions menu now have accessible names, translated through the locale bond and overridable with `rowActionsAriaLabel`. Clickable rows keep their table row role, and Enter or Space on a row's checkbox or actions button works normally instead of triggering the row click.

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
