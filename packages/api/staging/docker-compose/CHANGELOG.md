# @molecule/api-staging-docker-compose

## 1.0.2

### Patch Changes

- 5048d05: Docker Compose commands are now time-bounded, so an unresponsive Docker daemon fails the call instead of leaving `up`, `down` or health checks pending indefinitely.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-staging@1.0.1
