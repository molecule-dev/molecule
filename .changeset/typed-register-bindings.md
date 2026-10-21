---
'@molecule/app-vue': patch
'@molecule/app-solid': patch
'@molecule/app-svelte': patch
'@molecule/app-angular': patch
---

Framework auth bindings accept the app's own registration fields (`useAuth<MyUser, { username: string }>()`, `createAuth<…>`, `createAuthStores<…>`, `MoleculeAuthService<…>`), typing `register()` like the auth client's.
