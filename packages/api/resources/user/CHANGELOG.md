# @molecule/api-resource-user

## 1.1.0

### Minor Changes

- OAuth sign-up/login now persists the provider profile: display name (falling back to the email's local part), bio, and the profile image re-hosted as an inline data URI (never a third-party URL). Blank name/bio/avatar are backfilled on later OAuth logins without overwriting user-set values.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-bond@1.0.1
  - @molecule/api-config@1.0.1
  - @molecule/api-database@1.0.1
  - @molecule/api-entitlements@1.0.1
  - @molecule/api-i18n@1.0.1
  - @molecule/api-jwt@1.0.1
  - @molecule/api-locales-user@1.0.1
  - @molecule/api-locales-user-payments@1.0.1
  - @molecule/api-password@1.0.1
  - @molecule/api-payments@1.0.1
  - @molecule/api-push-notifications@1.0.1
  - @molecule/api-rate-limit@1.0.1
  - @molecule/api-resource@1.0.1
  - @molecule/api-resource-device@1.0.1
  - @molecule/api-secrets@1.0.1
  - @molecule/api-two-factor@1.0.1
