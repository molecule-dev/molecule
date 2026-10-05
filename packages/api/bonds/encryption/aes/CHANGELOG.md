# @molecule/api-encryption-aes

## 1.1.0

### Minor Changes

- 182aed3: Add authenticated chunked AES-256-GCM stream encryption with a per-stream HKDF subkey and a key id, detecting tampering, reordering, a wrong context, a wrong key and truncation without holding the stream in memory.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-encryption@1.0.1
  - @molecule/api-secrets@1.0.1
