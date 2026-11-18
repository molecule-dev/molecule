---
'@molecule/app-react-native': patch
---

`useAppState` reads `AppState` through `useSyncExternalStore`, so the first render reports the real state (not `'active'`) and a change before the subscription is not missed.
