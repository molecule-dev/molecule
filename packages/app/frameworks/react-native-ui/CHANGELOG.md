# @molecule/app-ui-react-native

## 2.0.1

### Patch Changes

- Publish without an `./elements` entry point, since the package does not ship native elements yet.

## 2.0.0

### Major Changes

- Use `onValueChange` and `onCheckedChange` for native fields and eventless handlers for presses and focus. Requires `@molecule/app-ui` 1.13.0 or later.

## 1.0.10

### Patch Changes

- `Skeleton` and `Toast` create their `Animated.Value` once per mount in a lazy state initializer instead of on every render.

## 1.0.9

### Patch Changes

- Require the `@molecule/app-ui` version that has the ClassMap members these components use.

## 1.0.8

### Patch Changes

- Components read translations through `useTranslation()`, so their text changes language the moment the locale switches instead of on their next unrelated re-render.

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
