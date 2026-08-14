# @molecule/app-locales-ide

## 1.1.0

### Minor Changes

- The model picker prices models on cache reads — the dominant cost in agentic traffic — instead of list input price alone, and flags models whose region is in a peak-surcharge window.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-i18n@1.0.1
