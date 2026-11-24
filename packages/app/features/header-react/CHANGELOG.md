# @molecule/app-header-react

## 4.2.1

### Patch Changes

- A node prop that renders nothing, such as an empty list, `false` or `''`, renders the same as leaving the prop out.

## 4.2.0

### Minor Changes

- Read the router through `@molecule/app-react` instead of React Router, so these components work under any routing bond; a guard or layout without children renders the binding's `RoutedView`.

### Patch Changes

- Requires a framework binding version that refuses a routing bond too old to give it a router.

## 4.1.0

### Minor Changes

- Render declared header destinations as native links in a named navigation landmark.

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
