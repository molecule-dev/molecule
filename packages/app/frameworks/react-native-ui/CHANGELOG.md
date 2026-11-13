# @molecule/app-ui-react-native

## 1.0.7

### Patch Changes

- The clearable Input's clear button shows the close icon and is labelled "Clear" for screen readers, and Pagination and Table use the same English defaults as the other UI frameworks.

## 1.0.6

### Patch Changes

- ClassMap tokens for truncated text, minimum width, `object-cover`, pointer events, a left-docked drawer and the user menu parts, with numeric sizes safelisted; the React and React Native components use them instead of raw class names.

## 1.0.5

### Patch Changes

- Align generated API documentation with source declarations and signatures.

## 1.0.4

### Patch Changes

- Declare the peers this package loads on start-up as required instead of optional.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-i18n@1.0.1
  - @molecule/app-icons@1.0.1
  - @molecule/app-ui@1.0.1
