# @molecule/app-notifications-page-react

## 4.3.0

### Minor Changes

- Render with the renderer-neutral elements, so the component also renders on React Native; it peers on `@molecule/app-ui-react` 4.4.

## 4.2.0

### Minor Changes

- Read the router through `@molecule/app-react` instead of React Router, so these components work under any routing bond; a guard or layout without children renders the binding's `RoutedView`.

## 4.1.0

### Minor Changes

- A response for a superseded filter or page is dropped, so a slow earlier request no longer replaces the page on screen; the package now peers on `@molecule/app-react` 4.8 or later.

## 4.0.0

### Patch Changes

- Updated dependencies
  - @molecule/app-react@4.0.0
  - @molecule/app-notification-feed-react@4.0.0

## 3.0.0

### Patch Changes

- Updated dependencies
  - @molecule/app-react@3.0.0
  - @molecule/app-notification-feed-react@3.0.0

## 2.0.0

### Patch Changes

- @molecule/app-react@2.0.0
- @molecule/app-notification-feed-react@2.0.0

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-i18n@1.0.1
  - @molecule/app-notification-feed-react@1.0.1
  - @molecule/app-react@1.0.1
  - @molecule/app-ui@1.0.1
