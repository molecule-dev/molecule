# @molecule/app-solid

## 2.0.0

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @molecule/app-auth@3.0.0

## 1.0.6

### Patch Changes

- Accept `@molecule/app-auth` 2.x alongside 1.x. The auth types this package reads are
  unchanged across both majors.

## 1.0.4

### Patch Changes

- b8dd395: Framework auth bindings accept the app's own registration fields (`useAuth<MyUser, CustomRegister>()`, `createAuth<…>`, `createAuthStores<…>`, `MoleculeAuthService<…>` — a type alias or an interface), typing `register()` like the auth client's.

## 1.0.3

### Patch Changes

- 7857fd8: Dependencies updated: both bindings are now tested against solid-js 1.9.17, which resolves the patched seroval 1.6.x.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-auth@1.0.1
  - @molecule/app-device@1.0.1
  - @molecule/app-forms@1.0.1
  - @molecule/app-http@1.0.1
  - @molecule/app-i18n@1.0.1
  - @molecule/app-logger@1.0.1
  - @molecule/app-platform@1.0.1
  - @molecule/app-push@1.0.1
  - @molecule/app-routing@1.0.1
  - @molecule/app-state@1.0.1
  - @molecule/app-storage@1.0.1
  - @molecule/app-theme@1.0.1
  - @molecule/app-ui@1.0.1
  - @molecule/app-utilities@1.0.1
  - @molecule/app-version@1.0.1
