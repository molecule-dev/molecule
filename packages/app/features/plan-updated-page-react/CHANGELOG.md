# @molecule/app-plan-updated-page-react

## 1.1.0

### Minor Changes

- 49f6145: `PlanUpdated` now confirms the purchase a checkout redirect returns with, showing a spinner while it is in flight and a retry if it fails. New `provider` and `verify` props. Requires `@molecule/app-react` ^1.1.0.

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
