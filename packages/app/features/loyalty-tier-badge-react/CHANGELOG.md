# @molecule/app-loyalty-tier-badge-react

## 4.1.0

### Minor Changes

- Render with the renderer-neutral elements, so the component also renders on React Native; it peers on `@molecule/app-ui-react` 4.4.

## 4.0.1

### Patch Changes

- Tier names are looked up through literal translation keys, and the locale bond adds the bronze, silver, gold and platinum labels in every language. The badge's neutral chrome — glyph border, progress track and secondary text — now follows the theme's tones instead of fixed colours.

## 4.0.0

### Patch Changes

- Updated dependencies
  - @molecule/app-react@4.0.0

## 3.0.0

### Patch Changes

- Updated dependencies
  - @molecule/app-react@3.0.0

## 2.0.0

### Patch Changes

- @molecule/app-react@2.0.0

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-i18n@1.0.1
  - @molecule/app-react@1.0.1
  - @molecule/app-ui@1.0.1
