---
'@molecule/app-react': minor
---

Add `useStoragePreference`, a React subscription over the storage preference snapshot that converges an asynchronous provider's hydration without remounting and keeps a local edit ahead of a stale read. `useStorageValue` now ignores an initial read that a newer local write superseded, and syncs changes through the provider instead of the browser `storage` event.
