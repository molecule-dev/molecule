# @molecule/app-auth-modal-react

## 1.1.0

### Minor Changes

- New `captchaSlot` / `captchaSolved` props render a human-verification challenge in the signup form and gate its submit, so an API that requires a verification token can be used from the in-app modal.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-auth-shell-react@1.0.1
  - @molecule/app-i18n@1.0.1
  - @molecule/app-oauth-buttons-react@1.0.1
  - @molecule/app-react@1.0.1
  - @molecule/app-ui@1.0.1
  - @molecule/app-ui-react@1.0.1
