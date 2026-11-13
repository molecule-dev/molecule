# @molecule/app-locales-battery

## 1.0.6

### Patch Changes

- Every error and label these packages show has one English text that matches its locale bond and is translated in every supported language; values are passed as {{placeholders}} instead of being written into the English.

## 1.0.5

### Patch Changes

- Translate every key into every supported language, keeping the spacing around interpolated values and the code names they mention.

## 1.0.4

### Patch Changes

- f58e283: Ship a lazy per-language `loader.js` entry with every companion locale bond, load companion bonds on demand instead of all at once, precache only the app shell, and let bundlers drop unused UI components.

## 1.0.2

### Patch Changes

- 9e3e202: Translations whose interpolation token had been lost or renamed now carry the same tokens as their English source, so a value like `{{count}}` resolves instead of rendering as literal text.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-i18n@1.0.1
