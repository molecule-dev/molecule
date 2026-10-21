---
'@molecule/app-vue': patch
'@molecule/app-solid': patch
'@molecule/app-svelte': patch
'@molecule/app-angular': patch
---

Framework auth bindings accept the app's own registration fields (`useAuth<MyUser, CustomRegister>()`, `createAuth<…>`, `createAuthStores<…>`, `MoleculeAuthService<…>` — a type alias or an interface), typing `register()` like the auth client's.
