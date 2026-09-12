# @molecule/app-e2e-fixtures-default

## 1.0.2

### Patch Changes

- b5bd9f8: `test` and `expect` now come from `@molecule/app-e2e`, so the same specs run on real browsers locally and against the live preview inside a molecule sandbox.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.
