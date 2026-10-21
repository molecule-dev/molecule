---
'@molecule/app-react': patch
---

`useAuth()` and `useSignup()` accept the app's own registration fields (`useAuth<MyUser, CustomRegister>()`, a type alias or an interface), typing `register()`/`signup()` like the auth client's `register()`.
