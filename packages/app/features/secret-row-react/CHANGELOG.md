# @molecule/app-secret-row-react

## 4.2.0

### Minor Changes

- Render with the renderer-neutral elements, so the component also renders on React Native; it peers on `@molecule/app-ui-react` 4.4.

## 4.1.0

### Minor Changes

- Copy through `@molecule/app-clipboard`, now a peer dependency, so copying works where the Clipboard API is missing or refuses, and the copied state shows only after a successful copy. The expired tag uses the theme error tone, which needs `@molecule/app-ui` 1.4.0.

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
