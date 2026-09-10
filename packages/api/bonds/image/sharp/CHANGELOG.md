# @molecule/api-image-sharp

## 1.0.2

### Patch Changes

- e96fd5c: Pins sharp 0.35.4, fixing the libheif/libvips CVEs (GHSA-rgj7-g3m4-5g8c).

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-image@1.0.1
