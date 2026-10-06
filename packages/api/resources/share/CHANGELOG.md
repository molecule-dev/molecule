# @molecule/api-resource-share

## 1.0.4

### Patch Changes

- 0d9654e: Public share-link slugs are now always generated with `node:crypto` `randomBytes`, with no `Math.random` fallback.

## 1.0.3

### Patch Changes

- dbd0dd1: The list endpoints clamp the `limit` query parameter into 1..500 — an oversized `limit` previously passed through unbounded to the store query (and the device query allowed up to 10000).

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
