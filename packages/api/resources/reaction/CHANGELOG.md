# @molecule/api-resource-reaction

## 1.0.5

### Patch Changes

- 84337e0: - `@molecule/api-resource-article`: the README now leads with the fact that a scaffold that lists this package already has its tables.
  - `@molecule/api-resource-comment`: the README now leads with the fact that a scaffold that lists this package already has its tables.
  - `@molecule/api-resource-follow`: the README now leads with the fact that a scaffold that lists this package already has its table.
  - `@molecule/api-resource-reaction`: the README now leads with the fact that a scaffold that lists this package already has its table.

## 1.0.4

### Patch Changes

- 5ece940: The docs say that a table the app already creates keeps its own columns, so missing ones need an ALTER.

## 1.0.3

### Patch Changes

- 83cdaa5: The package now publishes its table SQL, so a project installing it from npm can create its tables.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-database@1.0.1
  - @molecule/api-i18n@1.0.1
  - @molecule/api-logger@1.0.1
  - @molecule/api-resource@1.0.1
