---
'@molecule/app-auth': patch
---

`AuthClientConfig.storage` docs name the scaffold's generated auth bond, which is where `createBrowserStorageAdapter()` is passed — not `authConfig`.
