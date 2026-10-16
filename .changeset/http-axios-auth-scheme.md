---
'@molecule/app-http-axios': patch
'@molecule/app-bonds-default-react': patch
---

The auth token is sent with a configurable scheme. `createAxiosClient` takes `authScheme` — `Bearer` by default, or what the API expects, e.g. `Token` for an API that reads `Authorization: Token <jwt>`. It is the same option `@molecule/app-http`'s `HttpClientConfig` already declares, so a client config written against the core works unchanged on the Axios bond the scaffold wires. `createDefaultHttpClientWithAuthBearer` takes `authScheme` too.
