# @molecule/app-safe-link-react

## 1.1.0

### Minor Changes

- Read the router through `@molecule/app-react` instead of React Router, so these components work under any routing bond; a guard or layout without children renders the binding's `RoutedView`.

### Patch Changes

- Requires a framework binding version that refuses a routing bond too old to give it a router.

## 1.0.6

### Patch Changes

- Export `SafeLinkProps`, the props type of `SafeLink`.

## 1.0.5

### Patch Changes

- Preserve authored TypeScript declarations in generated API documentation.

## 1.0.3

### Patch Changes

- 8a0c6c3: Documentation now states the package imports from `react-router` and peer-depends on `react-router` `^7 || ^8`.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.
