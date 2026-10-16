# @molecule/api-locales-user

## 1.1.0

### Minor Changes

- 0ed89f7: Usernames are stored as sent or refused (letters, digits, `.`, `-`, `_`), a body nested under `user` gets its own error, `verifyMiddleware({ allowCookieSession: false })` makes an API token-only, and `utilities.stripSensitiveUserColumns` is exported.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-i18n@1.0.1
