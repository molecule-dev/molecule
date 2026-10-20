# @molecule/api-uploads-filesystem

## 1.1.0

### Minor Changes

- 7b65737: Adds a ping(), and registers a non-critical storage readiness probe that checks the upload directory is writable when @molecule/api-process-lifecycle is present.

## 1.0.3

### Patch Changes

- Documentation: the README now ships runnable example code (and the server-only browser guard/formatting was regenerated).

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-bond@1.0.1
  - @molecule/api-i18n@1.0.1
  - @molecule/api-uploads@1.0.1
