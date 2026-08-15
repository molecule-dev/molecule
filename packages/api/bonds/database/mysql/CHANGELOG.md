# @molecule/api-database-mysql

## 1.0.2

### Patch Changes

- 9ea501c: Accept hyphenated table/column identifiers (e.g. `resource-share-links`). Every interpolation site quotes identifiers, so hyphens are safe; the previous allowlist rejected `@molecule/api-resource-share`'s tables, making every share-link operation throw.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-bond@1.0.1
  - @molecule/api-database@1.0.1
  - @molecule/api-secrets@1.0.1
