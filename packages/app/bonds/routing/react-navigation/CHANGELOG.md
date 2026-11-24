# @molecule/app-routing-react-navigation

## 1.1.1

### Patch Changes

- `navigate()` to a path no screen in `linking.screens` matches logs an error naming the path instead of doing nothing.

## 1.1.0

### Minor Changes

- Add `useNavigationTheme()`, which gives `NavigationContainer` the colours of the bonded `@molecule/app-theme` provider.

## 1.0.10

### Patch Changes

- Accept the ref `createNavigationContainerRef()` returns from React Navigation 7 in `useMoleculeRouter` and `createReactNavigationRouter`.

## 1.0.9

### Patch Changes

- `createHref` resolves a path that is only a query or a hash against the current page, as `navigate` does.

## 1.0.8

### Patch Changes

- Add `Router.createHref` and the shared `@molecule/app-routing/bond-utilities` path helpers; named-route and missing-param errors are `I18nError`.

## 1.0.7

### Patch Changes

- Every error and label these packages show has one English text that matches its locale bond and is translated in every supported language; values are passed as {{placeholders}} instead of being written into the English.

## 1.0.6

### Patch Changes

- Align generated API documentation with source declarations and signatures.

## 1.0.5

### Patch Changes

- Declare the peers this package loads on start-up as required instead of optional.

## 1.0.4

### Patch Changes

- Preserve authored TypeScript declarations in generated API documentation.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-i18n@1.0.1
  - @molecule/app-routing@1.0.1
