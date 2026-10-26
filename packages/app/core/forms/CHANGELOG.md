# @molecule/app-forms

## 1.0.5

### Patch Changes

- Preserve authored TypeScript declarations in generated API documentation.

## 1.0.3

### Patch Changes

- c78c76f: Make `reset(values)` establish the resulting values as the new clean baseline, so a form reset to freshly loaded or saved data reads clean.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-bond@1.0.1
