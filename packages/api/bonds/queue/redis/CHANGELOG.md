# @molecule/api-queue-redis

## 1.1.0

### Minor Changes

- 7b65737: Adds a ping(), and registers a non-critical queue readiness probe and a worker-closing shutdown hook when @molecule/api-process-lifecycle is present.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-bond@1.0.1
  - @molecule/api-queue@1.0.1
  - @molecule/api-secrets@1.0.1
