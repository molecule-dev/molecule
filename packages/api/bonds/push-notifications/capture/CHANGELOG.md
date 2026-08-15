# @molecule/api-push-capture

## 1.0.2

### Patch Changes

- A throwing activity sink no longer changes a send's outcome: a real delivery still resolves, and a real failure still rejects with the real provider error.
- Document both modes on the module docs: intercept-only never delivers, while wrapping a real provider delivers and records the real outcome.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-activity@1.0.1
  - @molecule/api-push-notifications@1.0.1
