---
'@molecule/app-auth': patch
'@molecule/app-bonds-default-react': patch
---

Accept an ordinary interface for an app's custom registration fields: `createJWTAuthClient<User, CustomRegister>()` and the default-auth factories no longer require the fields be declared as a type alias.
