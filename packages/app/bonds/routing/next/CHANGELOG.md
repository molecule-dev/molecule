# @molecule/app-routing-next

## 1.1.0

### Minor Changes

- Add `MoleculeRouterProvider`, which gives `@molecule/app-react` the router, and bond the router before the pages run their effects.

## 1.0.8

### Patch Changes

- Carry a navigation's history state and key to the entry Next commits and keep them across `router.refresh()`; add `createHref` with the compiled `basePath`.

## 1.0.7

### Patch Changes

- Move the router's location mirror into its own module; behaviour is unchanged.

## 1.0.6

### Patch Changes

- Navigation state of any kind stays with its history entry and the location key names the entry, so Back returns the state and key it had. `useListRoute` in the React Router bond is built on `resolveListRoute` from `@molecule/app-routing`.

## 1.0.5

### Patch Changes

- Every error and label these packages show has one English text that matches its locale bond and is translated in every supported language; values are passed as {{placeholders}} instead of being written into the English.

## 1.0.4

### Patch Changes

- Align generated API documentation with source declarations and signatures.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-i18n@1.0.1
  - @molecule/app-logger@1.0.1
  - @molecule/app-routing@1.0.1
