# @molecule/api-ai-image-generation

## 1.1.0

### Minor Changes

- `ImageEditParams` gains an optional `images` field for multi-reference edits; providers that do not support it keep using `image` alone.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-bond@1.0.1
