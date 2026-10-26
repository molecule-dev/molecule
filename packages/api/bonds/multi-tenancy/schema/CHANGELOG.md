# @molecule/api-multi-tenancy-schema

## 1.0.5

### Patch Changes

- Preserve authored TypeScript declarations in generated API documentation.

## 1.0.3

### Patch Changes

- 25d125a: Reject malformed `findMany`, `findOne`, `count`, `updateMany` and `deleteMany` arguments with an actionable `TypeError` before running a query, instead of silently dropping the filter and reading every row.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-multi-tenancy@1.0.1
