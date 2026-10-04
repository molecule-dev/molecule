# @molecule/api-oauth-github

## 1.2.1

### Patch Changes

- 349bef1: Capture the user's actual email: verify() now reads `GET /user/emails` (the `user:email` scope it always requested) and returns the primary verified address, instead of only the public profile email — which is null for most users, so accounts were created with no email at all. Falls back to the public email when the endpoint is unavailable; a failed lookup never fails the login.

## 1.2.0

### Minor Changes

- The provider profile image is captured as the user's avatar.

## 1.1.0

### Minor Changes

- Map the user's display name, bio, and avatar URL from the GitHub profile.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-bond@1.0.1
  - @molecule/api-http@1.0.1
  - @molecule/api-oauth@1.0.1
  - @molecule/api-secrets@1.0.1
