# @molecule/api-resource-follow

## 1.0.9

### Patch Changes

- a9b4bc1: Document the user identity the followed-authors feed and `follow` share: for `targetType` `'user'`, `follows.targetId` is the target's user id (the value `articles.authorId` holds), so a username or display handle must be resolved first.

## 1.0.8

### Patch Changes

- 84337e0: - `@molecule/api-resource-article`: the README now leads with the fact that a scaffold that lists this package already has its tables.
  - `@molecule/api-resource-comment`: the README now leads with the fact that a scaffold that lists this package already has its tables.
  - `@molecule/api-resource-follow`: the README now leads with the fact that a scaffold that lists this package already has its table.
  - `@molecule/api-resource-reaction`: the README now leads with the fact that a scaffold that lists this package already has its table.

## 1.0.7

### Patch Changes

- 5ece940: The docs say that a table the app already creates keeps its own columns, so missing ones need an ALTER.

## 1.0.6

### Patch Changes

- 60d0840: The README documents every export with its signature, parameters and return value, namespace members included.

## 1.0.5

### Patch Changes

- 83cdaa5: The package now publishes its table SQL, so a project installing it from npm can create its tables.

## 1.0.4

### Patch Changes

- dbd0dd1: The list endpoints clamp the `limit` query parameter into 1..500 — an oversized `limit` previously passed through unbounded to the store query (and the device query allowed up to 10000).

## 1.0.2

### Patch Changes

- e4d5855: The list endpoints now clamp the `limit` query parameter into 1..500 — an oversized `limit` previously passed through unbounded to the store query.

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
