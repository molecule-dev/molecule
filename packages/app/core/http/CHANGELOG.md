# @molecule/app-http

## 1.5.0

### Minor Changes

- `setAuthTokenSource()` makes the bonded client — and the fallback `getClient()` returns while no client is bonded — read the source on each request, through the new optional `HttpClient.setAuthTokenResolver()` (the fetch client implements it) or, for a client without it, a request interceptor; so a session adopted with no auth event (`setSession()`, `setAccessToken()`) is sent instead of the previous account's token, a source with no token sends no `Authorization` header, and removing the source keeps the token it last returned.

### Patch Changes

- The fetch client no longer repeats an absolute `baseURL`'s path (`https://host/api` + `/api/users`), joins a base and a path with exactly one `/`, and requests protocol-relative URLs (`//cdn…`) as written.

## 1.4.0

### Minor Changes

- 4ae65a1: Retries idempotent requests twice on 502/503/504 or a reset connection, with jittered backoff and Retry-After; a POST/PATCH is repeated only with an Idempotency-Key.

### Patch Changes

- 8c20e8d: Clarify custom response envelope handling and account registration examples.

## 1.3.0

### Minor Changes

- 14b8cb5: An aborted request is now distinguishable without parsing its message: `HttpError` carries `aborted`, uses the `http.error.aborted` key, and `isAuthFailure`/`isNoResponse` classify a failure correctly (a status of 0 is never an auth failure).

## 1.2.1

### Patch Changes

- dc13c70: A request the auth gate's own session restore makes is never held by the gate, so a restore that uses the HTTP client no longer deadlocks every page.

## 1.2.0

### Minor Changes

- 4f3b142: `setAuthTokenSource(source)` gives every HTTP client bonded after (or at) the call the current access token, and `getClient()` returns its no-baseURL fallback without bonding it, so a client bonded later is still what every call sees.

## 1.1.6

### Patch Changes

- 1a9b4dd: Document that waiting for the session restore does not attach the token: a client created beside the auth bond needs `createDefaultHttpClientWithAuthBearer` plus `setAuthGate`.

## 1.1.5

### Patch Changes

- 9dd7092: A JSON request answered with an HTML document now throws an `HttpError` naming the page server and the client's `baseURL`, instead of resolving with the HTML as `data`; `getClient()` warns once when it mints its no-baseURL fallback.

## 1.1.4

### Patch Changes

- c6c04db: `@molecule/app-http`'s docs state the call shape every body-taking verb uses — `post(url, data, config)`, `put(url, data, config)`, `patch(url, data, config)`: the body is the SECOND argument, never `{ data: body }` (which sends `{"data":…}` as the body). A failed run's trace read now quotes the body a 4xx request sent beside the status and the response, so a wrapped body is visible in one line.

## 1.1.3

### Patch Changes

- 54ccf7c: A request can opt out of the auth gate with `skipAuthGate: true`. That is what a request the gate itself depends on must set: a gate that waits for a session restore whose own request goes through the same client waits on itself, holding the very request it is waiting for, and every request it holds stalls until the gate times out. That bound is now 3 s (was 10 s, measured against a normal restore's one round trip) and a timeout with requests held is reported at error level naming `skipAuthGate`, instead of a console warning.
- fffa0c5: A request is released when the auth gate throws synchronously, instead of waiting on it.
- 8e3ac7b: The `authScheme` guidance now names the call that takes it: `setClient(createFetchClient({ baseURL, authScheme: 'Token' }))`, the bonded provider's `createAxiosClient({ baseURL, authScheme: 'Token' })`, or the auth client's `createJWTAuthClient({ authScheme: 'Token' })`. It is a CONSTRUCTOR option — "the client config's `authScheme`" read as a property of the client `getClient()` returns, which has no such property.

## 1.1.2

### Patch Changes

- c3943ab: An HTTP request made while the session is still being restored now waits for that restore instead of being sent without credentials, so a page that fetches viewer-dependent data on mount — a profile's `following` flag, a feed, a `favorited` state — cannot answer for an anonymous viewer on a connection slow enough for the restore to lose the race. `@molecule/app-http` and `@molecule/app-http-axios` await a registered gate before every request (`setAuthGate` / `awaitAuthGate`); `@molecule/app-auth`'s client exposes `whenRestored()`, which resolves once the `initialize()` restore has settled and immediately when none is in flight; the default auth bonds register it, and an app with its own session module registers its own.

## 1.1.1

### Patch Changes

- 60d0840: The README documents every export with its signature, parameters and return value, namespace members included.

## 1.1.0

### Minor Changes

- 0e2d12e: The client config takes `authScheme` for APIs that read `Authorization: Token <jwt>` instead of `Bearer`.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-bond@1.0.1
  - @molecule/app-i18n@1.0.1
  - @molecule/app-logger@1.0.1
