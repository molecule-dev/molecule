# @molecule/app-locales-inline-edit

## 1.0.5

### Patch Changes

- The editor field's fallback accessible label is now looked up through i18n, so it follows the app's locale instead of staying in English. The locale bond adds the `inlineEdit.aria.edit` key in every language.

## 1.0.4

### Patch Changes

- The published package no longer includes its compiled tests.

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
