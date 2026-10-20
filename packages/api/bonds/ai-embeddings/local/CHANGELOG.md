# @molecule/api-ai-embeddings-local

## 1.0.3

### Patch Changes

- 423e454: Run local embeddings in a bounded worker thread so model loading and inference do not block server requests.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-ai-embeddings@1.0.1
