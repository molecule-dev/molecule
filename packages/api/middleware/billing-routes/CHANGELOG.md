# @molecule/api-billing-routes

## 1.1.0

### Minor Changes

- 49f6145: `POST /portal` no longer passes a caller-supplied `returnUrl` straight to the payment provider — the provider renders it as a link on its own domain, so an arbitrary one was an open redirect. Send an app-relative `returnPath` instead; a `returnUrl` is honored only when it is already on the app origin.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-bond@1.0.1
  - @molecule/api-payments@1.0.1
  - @molecule/api-secrets@1.0.1
