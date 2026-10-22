# @molecule/app-auth

## 1.6.1

### Patch Changes

- dece7ff: Add a bonded profile form hook that preserves edits during hydration and publishes saved user state.

## 1.6.0

### Minor Changes

- 6867239: `updateProfile()` accepts a configurable HTTP method and request body envelope, so an API whose profile route is `PUT /api/user` taking `{ user }` uses the shared client instead of a hand-written one; the default stays `PATCH` with the bare profile.

### Patch Changes

- e1f2b9f: Warn when an auth response mapper returns an ignored token field, without logging credentials or changing session behavior.

## 1.5.9

### Patch Changes

- 37c8311: Accept an ordinary interface for an app's custom registration fields: `createJWTAuthClient<User, CustomRegister>()` and the default-auth factories no longer require the fields be declared as a type alias.
- af86f93: `updateProfile()` caches the user from a `{ props }` or `{ user }` profile answer instead of the response envelope.

## 1.5.8

### Patch Changes

- b343ba1: `status` now reports `'loading'` only while there is no decision yet, so a login or register request in flight no longer unmounts a page that guards on `'loading'`; progress stays on `state.loading`.
- 7cd56de: A rejected auth call's error now keeps the response's parsed `body` (nested maps, arrays and all) and HTTP `status`, so an app can show the API's own validation messages.

## 1.5.7

### Patch Changes

- 9883b58: `AuthClientConfig` accepts the app's user type, so `mapAuthResponse` is checked against the same profile `createJWTAuthClient` returns; `useAuth()` now exposes `setSession` for adopting a caller-issued session in one update.

## 1.5.6

### Patch Changes

- 7a82fe9: A client that was never explicitly initialized restores its session on the first state read, and repeated `initialize()` calls share one request.

## 1.5.5

### Patch Changes

- 14b8cb5: A background token refresh that fails without an HTTP answer (network drop, aborted request, 5xx) keeps the session; only a 401/403 from the server signs the user out.

## 1.5.4

### Patch Changes

- f1a9581: `initialize()` renders a stored token and user as authenticated on the first paint, and `mapAuthResponse` shapes the user on every answer that adopts one, including session validation, cookie restore and token refresh.
- cb2f781: `setSession({ accessToken, user })` adopts a session an exchange outside the client already established, and a session check that returns an unchanged user no longer notifies subscribers or replaces the user object.

## 1.5.3

### Patch Changes

- 5467bd0: A current-user route that answers 404 no longer signs the user out: `validateSession()` clears the stored session only on 401/403, and a 404 keeps the token and user with an error naming `currentUserEndpoint`.
- dc0ed41: In a browser the auth client now keeps the session in Web Storage by default (and warns when an explicit `'memory'` store is paired with a `tokenKey`), so a page reload stays signed in without extra wiring.

## 1.5.2

### Patch Changes

- 1a9b4dd: Document the token wiring a separately created HTTP client needs after the session restore: `createDefaultHttpClientWithAuthBearer` plus `setAuthGate(() => authClient.whenRestored())`.

## 1.5.1

### Patch Changes

- b2547ef: Auto-refresh schedules nothing when the API issued no refresh token — a cookie-session API no longer signs the user out while their access token is still valid; only an API 401 or an explicit logout ends the session.

## 1.5.0

### Minor Changes

- 437700a: `RegisterData<TExtra>` and `createJWTAuthClient<T, TRegister>` accept an app's own registration fields (`username`, …) at the top level, so `requestBody` receives exactly the payload the form passed instead of an app casting it.

## 1.4.1

### Patch Changes

- 5bb648d: `AuthClientConfig.storage` states the trade-off plainly: in-memory is the secure default, and an app whose external contract requires the token at its own key opts in with `storage: createBrowserStorageAdapter()` plus `tokenKey: 'jwtToken'`.

## 1.4.0

### Minor Changes

- ec3aaaa: Add `AuthState.status` and `AuthClient.validateSession()` for a restored session the server has not yet confirmed, and `tokenKey` to store the access token under another tool's exact key.

## 1.3.2

### Patch Changes

- cc7c874: `createBrowserStorageAdapter` now documents that a stored token and user restore the session synchronously with no request, so an app should render from that state and never block its first paint on its own profile request.
- afd9c9e: `@molecule/app-auth` documents how to wire it by hand in a scaffolded app (`createJWTAuthClient`/`setClient`, `initialize()`, `MoleculeProvider`/`useAuth()`) and why a hand-rolled token store races the session restore.

## 1.3.1

### Patch Changes

- f0f9426: `AuthClientConfig.storage` docs name the scaffold's generated auth bond, which is where `createBrowserStorageAdapter()` is passed — not `authConfig`.

## 1.3.0

### Minor Changes

- 3e3a20f: `createBrowserStorageAdapter()` builds a `StorageAdapter` over the browser's Web Storage, which is what
  keeps a signed-in session across a page reload when the API issues no httpOnly session cookie. Pass it as
  `AuthClientConfig.storage`; `kind: 'session'` narrows it to the tab's lifetime. The client's own default
  stays `'memory'`, and an httpOnly cookie session remains the stronger choice wherever the API sets one —
  a token in Web Storage is readable by any script on the origin. `AuthClientConfig.storage`'s docs now say
  which store to pick, how to swap it, and what each costs.

### Patch Changes

- 54ccf7c: The auth docs name the one request a registered gate must exempt: an app whose own session store restores through the bonded HTTP client sends that request with `skipAuthGate: true`, or the gate holds the request it is waiting for. The shipped restore never needs it — it sends its current-user request with `fetch`, so the gate the default auth bonds register cannot hold it.
- 8e3ac7b: The `authScheme` guidance now names the call that takes it: `setClient(createFetchClient({ baseURL, authScheme: 'Token' }))`, the bonded provider's `createAxiosClient({ baseURL, authScheme: 'Token' })`, or the auth client's `createJWTAuthClient({ authScheme: 'Token' })`. It is a CONSTRUCTOR option — "the client config's `authScheme`" read as a property of the client `getClient()` returns, which has no such property.

## 1.2.2

### Patch Changes

- c3943ab: An HTTP request made while the session is still being restored now waits for that restore instead of being sent without credentials, so a page that fetches viewer-dependent data on mount — a profile's `following` flag, a feed, a `favorited` state — cannot answer for an anonymous viewer on a connection slow enough for the restore to lose the race. `@molecule/app-http` and `@molecule/app-http-axios` await a registered gate before every request (`setAuthGate` / `awaitAuthGate`); `@molecule/app-auth`'s client exposes `whenRestored()`, which resolves once the `initialize()` restore has settled and immediately when none is in flight; the default auth bonds register it, and an app with its own session module registers its own.

## 1.2.1

### Patch Changes

- 60d0840: The README documents every export with its signature, parameters and return value, namespace members included.

## 1.2.0

### Minor Changes

- 0006e0e: The JWT auth client takes `requestBody`, `mapAuthResponse` and `authScheme`, for APIs with their own auth envelope and header scheme.

## 1.1.2

### Patch Changes

- A failed cookie-session restore (401) now clears the stale `mol_auth` presence hint, so an expired server-side session (or a DB reset) no longer re-fires a guaranteed-401 `/users/me` probe — and its console error — on every subsequent page load. The next real login re-sets the hint alongside the fresh cookie.

## 1.1.0

### Minor Changes

- e404093: `AuthClientConfig.shouldRestoreUser` lets an app reject a cookie-restored user and clear the stale presence hint, so an anonymous session cannot hydrate as a blank signed-in user. Defaults to current behaviour.

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
