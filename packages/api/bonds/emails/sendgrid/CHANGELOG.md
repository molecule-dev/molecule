# @molecule/api-emails-sendgrid

## 1.0.3

### Patch Changes

- 9237172: api-analytics gains `trackBondFailure` — the standard bond failure telemetry (`bond.failure` events, best-effort and throttled) that makes every vendor-facing bond failure queryable. The email, S3 uploads and Stripe bonds emit it at their vendor failure boundaries, including swallowed ones like a webhook handler returning null.
- Updated dependencies [9237172]
  - @molecule/api-analytics@1.1.0

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-bond@1.0.1
  - @molecule/api-emails@1.0.1
  - @molecule/api-secrets@1.0.1
