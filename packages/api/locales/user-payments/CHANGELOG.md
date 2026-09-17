# @molecule/api-locales-user-payments

## 1.0.2

### Patch Changes

- 9e3e202: Translations whose interpolation token had been lost or renamed now carry the same tokens as their English source, so a value like `{{count}}` resolves instead of rendering as literal text.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-i18n@1.0.1
