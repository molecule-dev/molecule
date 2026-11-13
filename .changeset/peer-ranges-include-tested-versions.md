---
'@molecule/app-angular': patch
'@molecule/app-ui-angular': patch
---

The `@angular/*` peer ranges now accept every Angular 22 release, including the 22.2.3 these packages are tested with, and `createChangePasswordState` / `createPasswordResetState` accept the client `AUTH_CLIENT` provides.
