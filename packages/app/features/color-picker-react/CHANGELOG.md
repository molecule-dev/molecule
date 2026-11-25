# @molecule/app-color-picker-react

## 4.1.0

### Minor Changes

- Renders the color picker with shared web and React Native fields and sliders. Requires `@molecule/app-ui-react` 4.7.0 and `@molecule/app-ui` 1.9.0.

### Patch Changes

- Keeps the original range input attribute order on the color sliders.

## 4.0.1

### Patch Changes

- The channel labels use literal translation keys (`colorPicker.r`, `colorPicker.g`, `colorPicker.b`).

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
