# @molecule/api-password-bcrypt

## 1.1.0

### Minor Changes

- cd7b007: `@molecule/api-password-bcrypt` hashes with the native `bcrypt` addon and falls back to `bcryptjs` on a platform with no usable prebuild. The cost factor is unchanged and both implementations read and write the same `$2b$` hashes, so stored hashes keep working either way. What changes is that a cost-12 hash no longer occupies the event loop for ~100 ms at a time — the addon runs the same computation on a threadpool thread — which is what made concurrent signups take seconds on a single-vCPU deployment. `provider`, plus the new `loadNativeBcrypt()` and `NativeBcrypt`, are exported from the package root.

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
  - @molecule/api-password@1.0.1
