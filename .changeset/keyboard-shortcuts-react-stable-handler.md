---
'@molecule/app-keyboard-shortcuts-react': minor
---

`useKeyboardShortcut` calls the latest committed handler through `useStableCallback` from `@molecule/app-react/render`, so a render React discards never runs; the package now peers on `@molecule/app-react` 4.8 or later.
