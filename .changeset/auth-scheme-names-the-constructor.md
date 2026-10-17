---
'@molecule/app-http': patch
'@molecule/app-http-axios': patch
'@molecule/app-auth': patch
'@molecule/app-bonds-default-react': patch
---

The `authScheme` guidance now names the call that takes it: `setClient(createFetchClient({ baseURL, authScheme: 'Token' }))`, the bonded provider's `createAxiosClient({ baseURL, authScheme: 'Token' })`, or the auth client's `createJWTAuthClient({ authScheme: 'Token' })`. It is a CONSTRUCTOR option — "the client config's `authScheme`" read as a property of the client `getClient()` returns, which has no such property.
