# @molecule/app-bond

## 1.0.3

### Patch Changes

- 1add3c1: Say whether a failed bond accessor ran before the app's bond setup or after it, and name the calling module.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.
