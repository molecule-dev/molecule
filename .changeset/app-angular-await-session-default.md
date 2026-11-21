---
'@molecule/app-angular': minor
---

`provideMolecule({ auth })` now holds bootstrap until the session restore settles by default, as React's `MoleculeProvider` does; pass `awaitSession: false` to render at once. Adds the `./link` entry and the exported `LinkProps`, `SessionReadyProps`, `UseTFunction` and `UseWorkspaceResult` types.
