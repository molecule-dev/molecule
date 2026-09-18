# @molecule/api-jwt

## 1.0.2

### Patch Changes

- 7301411: Generated JWT private-key PEM files are now written with owner-only permissions (`0o600`, directory `0o700`), and the legacy-location migration chmods the copied private key down as well.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-bond@1.0.1
