---
'@molecule/app-react': patch
---

`useAuth()` and `useSignup()` accept the app's own registration fields (`useAuth<MyUser, { username: string }>()`), typing `register()`/`signup()` like the auth client's `register()`.
