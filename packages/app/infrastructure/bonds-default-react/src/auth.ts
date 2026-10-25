import type {
  AuthClient,
  AuthClientConfigOptions,
  AuthEvent,
  AuthProfileConstraint,
  RegisterExtraShape,
  UserProfile,
} from '@molecule/app-auth'
import { createJWTAuthClient, setClient } from '@molecule/app-auth'
import type { HttpClient } from '@molecule/app-http'
import {
  createFetchClient,
  getClient as getHttpClient,
  setAuthGate,
  setAuthTokenSource as setHttpAuthTokenSource,
  setClient as setHttpClient,
} from '@molecule/app-http'

/**
 * Holds every HTTP request until this auth client's session restore has settled.
 *
 * Without it a page effect that fires on mount (fetching a profile's `following`
 * flag, a feed, a `favorited` state) sends its request before `initialize()` has
 * restored the session, so it leaves with no `Authorization` header and the server
 * answers for an anonymous viewer. Localhost usually hides it — the restore wins
 * the race against the first effect there — and the deployed URL exposes it, which
 * is how X1 xr-molecule-flash-m95 spent ~25 min treating a "Follow" button on a
 * followed user as database leftovers.
 *
 * `whenRestored()` resolves immediately when no restore is in flight, so a request
 * made after boot never waits at all; it holds only while the restore is actually
 * running. A provider without `whenRestored` (a bond that restores nothing) leaves
 * requests ungated.
 *
 * The restore this gate waits for does NOT go through the gated client — both default auth
 * bonds' `createJWTAuthClient` restores with `fetch` — so the scaffold's own wiring cannot
 * deadlock. An app that registers its own gate over a restore made through the bonded client
 * must exempt that request with `skipAuthGate: true`
 * (`setAuthGate(() => store.whenSettled())` + `http.get(currentUserEndpoint, { skipAuthGate: true })`
 * in the store); otherwise the gate holds the request it is waiting for and every request it
 * holds stalls until the gate times out. See `RequestConfig.skipAuthGate` in `@molecule/app-http`.
 *
 * @param authClient - The bonded auth client.
 */
function registerAuthGate(authClient: { whenRestored?: () => Promise<void> }): void {
  setAuthGate(() => authClient.whenRestored?.() ?? Promise.resolve())
}

/**
 * Builds the default fetch-based HTTP client + wires it into
 * `@molecule/app-http`. Replaces the per-app `bonds/http-default.ts`
 * shipped by ~52 fleet apps.
 *
 * @example
 * ```ts
 * // bonds/http-default.ts
 * import { createDefaultHttpClient } from '@molecule/app-bonds-default-react'
 * import { API_BASE_URL } from '../config.js'
 *
 * export const { httpClient, setupHttpDefault } = createDefaultHttpClient(API_BASE_URL)
 * ```
 */
export function createDefaultHttpClient(baseURL: string): {
  httpClient: HttpClient
  setupHttpDefault: () => void
} {
  const httpClient = createFetchClient({ baseURL })
  return {
    httpClient,
    setupHttpDefault: () => setHttpClient(httpClient),
  }
}

/**
 * Variant of `createDefaultHttpClient` that adds a request interceptor
 * injecting the JWT bearer token from the auth client AND (optionally)
 * stripping a leading `/api/` from request URLs.
 *
 * Replaces ~20 per-app `bonds/http-default.ts` files that hand-roll
 * this same wiring. Pass `stripApiPrefix: true` when the app uses
 * `baseURL: '/api'` to handle pages that pass `/api/`-prefixed paths
 * (would otherwise resolve to `/api/api/...` and 404). Pass `authScheme`
 * when the API reads another scheme than `Bearer`: it is an option of THIS
 * constructor (`createDefaultHttpClientWithAuthBearer({ authScheme: 'Token', … })`,
 * or `createFetchClient({ baseURL, authScheme: 'Token' })` directly), never a
 * property of the client it returns. The client is built with the same scheme, so
 * a token the client also holds — the one a default auth bond's token sync gives
 * it — is sent with that scheme too, not as `Bearer`.
 */
export function createDefaultHttpClientWithAuthBearer(opts: {
  baseURL: string
  withCredentials?: boolean
  stripApiPrefix?: boolean
  getToken: () => string | null | undefined
  /**
   * The scheme of the `Authorization` header the token from `getToken()` is sent
   * with: `Bearer` (default), or what the API expects, e.g. `Token` for an API
   * that reads `Authorization: Token <jwt>`. Pass it to this constructor — the
   * same option `@molecule/app-http`'s client config calls `authScheme`, and not
   * a property of the client that comes back.
   */
  authScheme?: string
}): {
  httpClient: HttpClient
  setupHttpDefault: () => void
} {
  const authScheme = opts.authScheme ?? 'Bearer'
  const httpClient = createFetchClient({
    baseURL: opts.baseURL,
    withCredentials: opts.withCredentials,
    // The client's own token (a default auth bond's token sync) overrides the interceptor's
    // header, so it must carry the same scheme.
    authScheme,
  })
  httpClient.addRequestInterceptor((config) => {
    if (opts.stripApiPrefix && typeof config.url === 'string' && config.url.startsWith('/api/')) {
      config.url = config.url.replace(/^\/api\//, '/')
    }
    const token = opts.getToken()
    if (token) {
      config.headers = { ...config.headers, Authorization: `${authScheme} ${token}` }
    }
    return config
  })
  return {
    httpClient,
    setupHttpDefault: () => setHttpClient(httpClient),
  }
}

/**
 * Builds the default JWT auth client + wires it into `@molecule/app-auth`.
 * Apps pass their own `authConfig` (which lives in `src/config.ts`).
 *
 * `TUser` is the profile the app's pages read, and may be any JSON object type —
 * including a profile with NO `id` (`{ username, email, bio, image }`), as in the
 * factory it wraps. Never add a synthetic `id` to satisfy a type: nothing in the
 * client reads it, and the fabricated value then travels into storage, `getUser()`
 * and every page. Omit the type parameter and the default is `UserProfile`, whose
 * `id: string` stays required — the profile is never inferred from `authConfig`
 * (not even from an annotated config variable), so an untyped wrapper call keeps
 * the default contract.
 *
 * Type the config with the SAME type (`const authConfig: AuthClientConfig<MyUser> = { … }`)
 * so its `mapAuthResponse` is checked against `MyUser`, and name that type at the
 * call (`createDefaultAuthClient<MyUser>(authConfig)`): a mapper that omits a
 * required custom field then fails at that call instead of shipping a signed-in
 * page that reads `undefined`. An annotated config alone does not supply the type
 * argument — that is a 1.8 caller shape this major changes (see
 * `AuthClientConfig`'s migration note in `@molecule/app-auth`).
 *
 * `TRegister` is the app's own registration fields (`{ username: string }` for a
 * RealWorld-shaped API), passed on to `@molecule/app-auth`'s factory so
 * `authClient.register({ username, email, password })` type-checks with no cast.
 *
 * @example
 * ```ts
 * // bonds/auth-default.ts
 * import { createDefaultAuthClient } from '@molecule/app-bonds-default-react'
 * import { authConfig } from '../config.js'
 *
 * export const { authClient, setupAuthDefault } =
 *   createDefaultAuthClient(authConfig)
 * ```
 */
export function createDefaultAuthClient<
  TUser extends AuthProfileConstraint<TUser> = UserProfile,
  TRegister extends RegisterExtraShape<TRegister> = Record<never, never>,
>(
  authConfig: NoInfer<AuthClientConfigOptions<TUser>>,
): {
  authClient: AuthClient<TUser, TRegister>
  setupAuthDefault: () => void
} {
  const authClient = createJWTAuthClient<TUser, TRegister>(authConfig)
  return {
    authClient,
    setupAuthDefault: () => setClient(authClient),
  }
}

/**
 * Variant of `createDefaultAuthClient` that also keeps the bonded
 * `@molecule/app-http` client's bearer token in sync with the auth client's session.
 * Required by apps whose http client must carry the JWT on every request — without
 * this wiring, authed endpoints return 401 after page reloads or token refresh.
 *
 * The sync is a LIVE read: `@molecule/app-http`'s `setAuthTokenSource` registers the auth
 * client's token, and every client the app bonds — one bonded after this setup too (the
 * scaffold wires auth BEFORE http; xr-molecule-flash-m156: a token copied into the client
 * present at setup was never sent) — reads it on each request. A session adopted with no
 * auth event (`useAuth().setSession()`, an OAuth callback's `setAccessToken()`, the same
 * profile under a new token) is therefore sent by the next request, not the previous
 * account's bearer. A transport without `setAuthTokenResolver` is followed through a request
 * interceptor (see `setAuthTokenSource` for which request first carries the change), and
 * auth events still push the token to it.
 *
 * A cookie session (no body token) resolves to `null`, so the request carries NO
 * `Authorization` header — a kept bearer would answer as the PRIOR session.
 * Requests also wait for the session restore, so a page that fetches viewer data on mount
 * cannot race it (see {@link registerAuthGate}).
 *
 * The profile type is `createDefaultAuthClient`'s: a JSON object type of named
 * fields (see `AuthProfileShape`), including an app profile with no `id`.
 */
export function createDefaultAuthClientWithHttpSync<
  TUser extends AuthProfileConstraint<TUser> = UserProfile,
  TRegister extends RegisterExtraShape<TRegister> = Record<never, never>,
>(
  authConfig: NoInfer<AuthClientConfigOptions<TUser>>,
): {
  authClient: AuthClient<TUser, TRegister>
  setupAuthDefault: () => void
} {
  const authClient = createJWTAuthClient<TUser, TRegister>(authConfig)
  return {
    authClient,
    setupAuthDefault: () => {
      setClient(authClient)
      // Requests made while the session is still restoring wait for it, so a page
      // effect that fetches viewer-dependent data on mount cannot race the restore.
      registerAuthGate(authClient)
      // Resolve the HTTP client per sync, never once here. `setClient` runs this
      // source, so the token reaches the client the scaffold bonds later as well as
      // one already bonded; a client kept from this moment would be the throwaway
      // fallback the later `setHttpDefault()` replaces. The client reads the source
      // itself on every request, so a session adopted by `setSession()` (no auth
      // event) or re-adopted for the same profile (no state change) is sent at once.
      setHttpAuthTokenSource(() => authClient.getAccessToken())
      authClient.addEventListener((event: AuthEvent<TUser>) => {
        if (event.type === 'login' || event.type === 'register' || event.type === 'refresh') {
          // Mirror the auth client's token EXACTLY — including null. Cookie-session
          // APIs issue no body token (the credential is the httpOnly cookie), and
          // keeping a previously-set bearer here would pin the http client to the
          // PRIOR session (e.g. a guest's) — the server prefers the Authorization
          // header over the fresh cookie, so every request 401s as the old user.
          //
          // A client that implements `setAuthTokenResolver` already resolves the source
          // per request; this push is what carries the same change to a transport that
          // does not (and keeps `getAuthToken()` current there).
          getHttpClient().setAuthToken(authClient.getAccessToken())
        } else if (event.type === 'logout') {
          getHttpClient().setAuthToken(null)
        }
      })
    },
  }
}

/**
 * Most aggressive variant — bonds a fetch-based HTTP client with the
 * given `baseURL` (so molecule pkg `useGet('/path')` calls hit
 * `${baseURL}/path` instead of the SPA's catch-all route), AND keeps
 * its bearer token in sync with the auth client's session, read on every
 * request: a session adopted with no auth event (`setSession()`,
 * `setAccessToken()`) is sent by the next request. The token uses the auth
 * config's `authScheme` (default `Bearer`); a client bonded after this setup
 * gets the same source and auth events.
 *
 * The auth client restores a stored token AND user SYNCHRONOUSLY, so the first
 * render is the signed-in UI — do not gate a protected page (or a provider of
 * yours) on a current-user request. This bond registers `whenRestored()` as the
 * HTTP gate, so requests still wait for the background restore/verification to
 * settle; only `useAuth().status === 'loading'` means "no decision yet"
 * (xr-molecule-flash-m177: a page that waited on its own `/me` paid a round trip
 * on every navigation).
 *
 * Used by apps where molecule packages render pricing / billing /
 * other authed JSON-fetching screens that need both behaviors.
 *
 * Requests are also held until the session restore settles (see
 * {@link registerAuthGate}), so a page that fetches viewer-dependent data on
 * mount cannot race it and answer for an anonymous viewer.
 *
 * The profile type is `createDefaultAuthClient`'s: a JSON object type of named
 * fields (see `AuthProfileShape`), including an app profile with no `id`.
 */
export function createDefaultAuthClientWithFetchClient<
  TUser extends AuthProfileConstraint<TUser> = UserProfile,
  TRegister extends RegisterExtraShape<TRegister> = Record<never, never>,
>(
  authConfig: NoInfer<AuthClientConfigOptions<TUser>>,
  fetchClientOptions: { baseURL: string; withCredentials?: boolean },
): {
  authClient: AuthClient<TUser, TRegister>
  setupAuthDefault: () => void
} {
  const authClient = createJWTAuthClient<TUser, TRegister>(authConfig)
  return {
    authClient,
    setupAuthDefault: () => {
      const httpClient = createFetchClient({
        baseURL: fetchClientOptions.baseURL,
        withCredentials: fetchClientOptions.withCredentials ?? true,
        // The scheme the auth config names for this token (`Authorization: Token <jwt>`).
        authScheme: authConfig.authScheme,
      })
      // Registered BEFORE the bond: `setHttpClient` applies the restored session's
      // token, and the same source reaches any client an app bonds later instead of
      // this one (xr-molecule-flash-m156 — a client captured at setup cannot). The
      // client resolves the source on every request, so a session adopted by
      // `setSession()` or `setAccessToken()` after this point is sent immediately.
      setHttpAuthTokenSource(() => authClient.getAccessToken())
      setHttpClient(httpClient)
      setClient(authClient)
      registerAuthGate(authClient)
      authClient.addEventListener((event: AuthEvent<TUser>) => {
        // The client bonded NOW, resolved per event: an app that bonds its own client after
        // this setup sends through that one, never through the client created above.
        if (event.type === 'login' || event.type === 'register' || event.type === 'refresh') {
          // Mirror the token exactly, including null — see the identical note in
          // createDefaultAuthClientWithHttpSync (stale bearer = stuck prior session).
          // The per-request read of the source above is the guarantee; this push keeps
          // `getAuthToken()` current on a transport without `setAuthTokenResolver`.
          getHttpClient().setAuthToken(authClient.getAccessToken())
        } else if (event.type === 'logout') {
          getHttpClient().setAuthToken(null)
        }
      })
    },
  }
}
