---
'@molecule/app-react': patch
---

`useStore(store)` no longer requires a `StateProvider`: it subscribes to the store it is handed, so a store made by a provider package's own `createStore()` / `createStoreWithActions()` works with no state bond. `useStateProvider()` still throws outside a provider, and its message now names the fix — which provider to render, and the import for it.
