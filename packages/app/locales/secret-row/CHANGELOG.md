# @molecule/app-locales-secret-row

## 1.1.0

### Minor Changes

- Each language can be imported on its own, as `<package>/<code>.js`.

### Patch Changes

- Join suffixes and prefixes to code names and placeholders in Armenian, Basque, Georgian, Hebrew, Korean and Malayalam, and say "call" correctly in Swahili.

## 1.0.5

### Patch Changes

- The published package no longer includes its compiled tests.

## 1.0.4

### Patch Changes

- Translate every key into every supported language, keeping the spacing around interpolated values and the code names they mention.

## 1.0.3

### Patch Changes

- f58e283: Ship a lazy per-language `loader.js` entry with every companion locale bond, load companion bonds on demand instead of all at once, precache only the app shell, and let bundlers drop unused UI components.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-i18n@1.0.1
