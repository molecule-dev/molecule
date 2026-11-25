# @molecule/app-embed-snippet-react

## 4.2.0

### Minor Changes

- Renders with the renderer-neutral elements, on the web and React Native; the web output is unchanged.

## 4.1.0

### Minor Changes

- Copying a snippet now goes through `@molecule/app-clipboard` (a new required peer), so the Copy button also works where the async Clipboard API is unavailable and the copied feedback appears only when the copy succeeded. The generated embed code is marked as untranslated code so page translation leaves it unchanged.

## 4.0.1

### Patch Changes

- Every error and label these packages show has one English text that matches its locale bond and is translated in every supported language; values are passed as {{placeholders}} instead of being written into the English.

## 4.0.0

### Patch Changes

- Updated dependencies
  - @molecule/app-react@4.0.0
  - @molecule/app-ui-react@4.0.0

## 3.0.0

### Patch Changes

- Updated dependencies
  - @molecule/app-react@3.0.0
  - @molecule/app-ui-react@3.0.0

## 2.0.0

### Patch Changes

- @molecule/app-react@2.0.0
- @molecule/app-ui-react@2.0.0

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
  - @molecule/app-ui-react@1.0.1
