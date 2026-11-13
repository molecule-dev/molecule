# @molecule/api-entitlements

## 1.1.4

### Patch Changes

- Every error and label these packages show has one English text that matches its locale bond and is translated in every supported language; values are passed as {{placeholders}} instead of being written into the English.

## 1.1.3

### Patch Changes

- Align generated API documentation with source declarations and signatures.

## 1.1.2

### Patch Changes

- Preserve authored TypeScript declarations in generated API documentation.

## 1.1.0

### Minor Changes

- bffb150: The effective-plan-key resolver now also receives the user id, so an app can grant a plan based on who the user is (for example, an operator-configured allowlist of internal accounts).

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
  - @molecule/api-i18n@1.0.1
  - @molecule/api-rate-limit@1.0.1
