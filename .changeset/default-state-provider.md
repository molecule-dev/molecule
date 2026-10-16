---
'@molecule/app-bonds-default-react': minor
'@molecule/app-react': patch
'@molecule/app-state': patch
---

`setupAllDefaultBonds()` now bonds a state provider, and `<MoleculeProvider>` supplies the React state context from it, so `createStore()` + `useStore()` work in a scaffolded app without wiring a state bond or passing a `state` prop; `@molecule/app-state`'s Quick Start no longer creates a store at module scope, where it would throw before the providers are set up.
