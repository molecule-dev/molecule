# @molecule/api-reporting-database

## 1.0.3

### Patch Changes

- 985d7b2: CSV exports now prefix cells that start with `=`, `+`, `-`, `@`, a tab or a carriage return with a single quote so spreadsheets read them as text, and quote cells containing carriage returns.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-database@1.0.1
  - @molecule/api-reporting@1.0.1
