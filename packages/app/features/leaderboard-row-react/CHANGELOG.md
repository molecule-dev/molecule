# @molecule/app-leaderboard-row-react

## 4.0.3

### Patch Changes

- A node prop that renders nothing, such as an empty list, `false` or `''`, renders the same as leaving the prop out.

## 4.0.2

### Patch Changes

- A row with `onClick` is now a focusable button in the accessibility tree, and Enter or Space activate it. The rank-delta arrow and the current-user highlight take their colours from the theme's success, error and info tones instead of fixed hex values.

## 4.0.1

### Patch Changes

- Require the `@molecule/app-ui` version that has the ClassMap members these components use.

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
