# @molecule/app-http-axios

## 1.0.6

### Patch Changes

- 14b8cb5: A cancelled request (`ERR_CANCELED`) is flagged `aborted` with the `http.error.aborted` key, matching the fetch provider.

## 1.0.5

### Patch Changes

- c6c04db: `@molecule/app-http`'s docs state the call shape every body-taking verb uses — `post(url, data, config)`, `put(url, data, config)`, `patch(url, data, config)`: the body is the SECOND argument, never `{ data: body }` (which sends `{"data":…}` as the body). A failed run's trace read now quotes the body a 4xx request sent beside the status and the response, so a wrapped body is visible in one line.

## 1.0.4

### Patch Changes

- 54ccf7c: A request can opt out of the auth gate with `skipAuthGate: true`. That is what a request the gate itself depends on must set: a gate that waits for a session restore whose own request goes through the same client waits on itself, holding the very request it is waiting for, and every request it holds stalls until the gate times out. That bound is now 3 s (was 10 s, measured against a normal restore's one round trip) and a timeout with requests held is reported at error level naming `skipAuthGate`, instead of a console warning.
- 8e3ac7b: The `authScheme` guidance now names the call that takes it: `setClient(createFetchClient({ baseURL, authScheme: 'Token' }))`, the bonded provider's `createAxiosClient({ baseURL, authScheme: 'Token' })`, or the auth client's `createJWTAuthClient({ authScheme: 'Token' })`. It is a CONSTRUCTOR option — "the client config's `authScheme`" read as a property of the client `getClient()` returns, which has no such property.
- bb7e96a: The auth token is sent with a configurable scheme. `createAxiosClient` takes `authScheme` — `Bearer` by default, or what the API expects, e.g. `Token` for an API that reads `Authorization: Token <jwt>`. It is the same option `@molecule/app-http`'s `HttpClientConfig` already declares, so a client config written against the core works unchanged on the Axios bond the scaffold wires. `createDefaultHttpClientWithAuthBearer` takes `authScheme` too.

## 1.0.3

### Patch Changes

- c3943ab: An HTTP request made while the session is still being restored now waits for that restore instead of being sent without credentials, so a page that fetches viewer-dependent data on mount — a profile's `following` flag, a feed, a `favorited` state — cannot answer for an anonymous viewer on a connection slow enough for the restore to lose the race. `@molecule/app-http` and `@molecule/app-http-axios` await a registered gate before every request (`setAuthGate` / `awaitAuthGate`); `@molecule/app-auth`'s client exposes `whenRestored()`, which resolves once the `initialize()` restore has settled and immediately when none is in flight; the default auth bonds register it, and an app with its own session module registers its own.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-http@1.0.1
