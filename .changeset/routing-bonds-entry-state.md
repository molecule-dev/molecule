---
'@molecule/app-routing-react-router': minor
'@molecule/app-routing-next': patch
'@molecule/app-routing-vue-router': patch
---

Navigation state of any kind stays with its history entry and the location key names the entry, so Back returns the state and key it had. `useListRoute` in the React Router bond is built on `resolveListRoute` from `@molecule/app-routing`.
