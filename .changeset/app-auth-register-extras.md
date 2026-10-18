---
'@molecule/app-auth': minor
---

`RegisterData<TExtra>` and `createJWTAuthClient<T, TRegister>` accept an app's own registration fields (`username`, …) at the top level, so `requestBody` receives exactly the payload the form passed instead of an app casting it.
