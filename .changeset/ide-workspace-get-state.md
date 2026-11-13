---
'@molecule/app-ide': minor
'@molecule/app-ide-default': minor
---

`WorkspaceProvider` gains an optional `getState()` that returns the full workspace state, and the default provider implements it, so a binding that mounts after earlier panel changes reads them at once.
