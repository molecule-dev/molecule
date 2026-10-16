# @molecule/app-state

## 1.0.3

### Patch Changes

- 7b77ed5: `setupAllDefaultBonds()` now bonds a state provider, and `<MoleculeProvider>` supplies the React state context from it, so `createStore()` + `useStore()` work in a scaffolded app without wiring a state bond or passing a `state` prop; `@molecule/app-state`'s Quick Start no longer creates a store at module scope, where it would throw before the providers are set up.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-bond@1.0.1
  - @molecule/app-logger@1.0.1
