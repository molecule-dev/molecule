/**
 * Auth client creation and management.
 *
 * Provides the JWT-based auth client implementation.
 *
 * @module
 */

import { I18nError } from '@molecule/app-i18n'
import { getLogger } from '@molecule/app-logger'

import { createBrowserStorageAdapter } from './browser-storage.js'
import { createTokenStorage, getTokenExpiration, isTokenExpired } from './token.js'
import type {
  AuthClient,
  AuthClientConfig,
  AuthError,
  AuthEvent,
  AuthEventListener,
  AuthResult,
  AuthState,
  AuthStatus,
  LoginCredentials,
  PasswordResetConfirm,
  PasswordResetRequest,
  RegisterData,
  RegisterExtraShape,
  UserProfile,
} from './types.js'

/**
 * Whether this app is running inside a CROSS-SITE iframe — i.e. the molecule.dev
 * live preview (the app at `127.0.0.1:<port>` embedded in the `localhost:3000`
 * IDE). This mirrors the server's cross-site-preview decision (see
 * `@molecule/api-resource-user` `getAuthCookieOptions`): in that case the server
 * issues the `mol_auth` hint as `Secure; SameSite=None; Partitioned`, and a
 * Partitioned cookie can only be deleted by a Set-Cookie / `document.cookie`
 * write that ALSO carries Partitioned. A top-level document (the IDE itself, a
 * normally-deployed app, or local `vite dev`) sets a plain `Lax` hint that the
 * bare deletion already matches — so we must NOT append the cross-site attrs
 * there (they would target the wrong cookie jar and miss the real cookie).
 *
 * Comparing `window.self !== window.top` is reference-only, so it never throws
 * on a cross-origin embed.
 *
 * @returns `true` when embedded in a (cross-site) iframe, `false` at top level.
 */
const isCrossSitePreviewFrame = (): boolean => {
  try {
    return typeof window !== 'undefined' && window.self !== window.top
  } catch (_error) {
    // A cross-origin frame can, in rare engines, throw on `window.top` access —
    // if we can't tell, assume top-level (the safe default matching a Lax hint).
    return false
  }
}

/**
 * Deletes the non-httpOnly `mol_auth` session-presence hint so `initialize()`
 * won't probe for cookie-restore on later loads. The deletion must MATCH the
 * attributes the server SET the hint with, or it targets the wrong cookie jar
 * and the stale hint survives: only the cross-site live-preview iframe issues
 * `mol_auth` as `Secure; SameSite=None; Partitioned` (a Partitioned cookie can
 * only be deleted by a write that ALSO carries Partitioned); a top-level
 * document sets a plain `Lax` hint the bare deletion already matches.
 */
const clearSessionHintCookie = (): void => {
  if (typeof document === 'undefined') return
  const previewAttrs = isCrossSitePreviewFrame() ? '; Secure; SameSite=None; Partitioned' : ''
  document.cookie = `mol_auth=; Max-Age=0; path=/${previewAttrs}`
}

/**
 * Whether a usable browser Web Storage exists — the condition under which the
 * client's storage default is {@link createBrowserStorageAdapter} rather than
 * `'memory'`.
 *
 * A browser app kept in memory loses the session on every full page load: a
 * `page.goto` after sign-in signs the user out. Non-browser runtimes (SSR, a
 * Node test) have no Web Storage, so they keep the in-memory default.
 *
 * @returns `true` when `window.localStorage` can be read.
 */
const hasBrowserStorage = (): boolean => {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
  } catch (_error) {
    // A blocked/opaque context can throw on the property access itself; without a
    // readable store the client stays in memory (the non-browser default).
    return false
  }
}

/**
 * Whether two user profiles carry the same data.
 *
 * The profile the API returns is plain JSON — objects of scalars, arrays and nested objects —
 * so a structural walk is enough. `JSON.stringify` is not: it compares key order too, and two
 * objects built in a different order would read as a change.
 *
 * @param left - One profile (or `null`).
 * @param right - The other profile (or `null`).
 * @param depth - How deep the walk already is; a profile nested deeper than this is treated as
 *   different, which only costs one notification.
 * @returns `true` when both carry the same data.
 */
const sameUserData = (left: unknown, right: unknown, depth = 0): boolean => {
  if (left === right) return true
  if (depth > 8 || left === null || right === null) return false
  if (typeof left !== 'object' || typeof right !== 'object') return false
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false
    if (left.length !== right.length) return false
    return left.every((value, index) => sameUserData(value, right[index], depth + 1))
  }
  const leftRecord = left as Record<string, unknown>
  const rightRecord = right as Record<string, unknown>
  const leftKeys = Object.keys(leftRecord)
  if (leftKeys.length !== Object.keys(rightRecord).length) return false
  return leftKeys.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(rightRecord, key) &&
      sameUserData(leftRecord[key], rightRecord[key], depth + 1),
  )
}

/**
 * What a cookie-restore probe learned, so its caller can tell "there was nothing to
 * ask" from "the server rejected the session" and "the server did not answer".
 *
 * @template T - The user profile the API returns.
 */
interface SessionCookieRestore<T> {
  /** The user the server returned, already in the app's profile shape, or `null`. */
  user: T | null
  /** Whether a current-user request was sent at all. */
  attempted: boolean
  /** Whether the server rejected the cookie (401/403) — the session is dead. */
  rejected: boolean
  /** What went wrong when a request was sent but no user came back. */
  error?: string
}

/**
 * Creates a simple JWT-based auth client.
 *
 * This is a basic implementation that can be extended or replaced
 * with more sophisticated auth providers.
 *
 * @template T - The user profile the API returns. Pass it to the config too
 *   (`AuthClientConfig<T>`), so `mapAuthResponse` is checked against the same
 *   profile the client and the React hook hand to your pages.
 * @template TRegister - The app's own registration fields, accepted at the top
 *   level of `register()` (e.g. `{ username: string }` for a RealWorld-shaped API).
 *   An interface and a type alias are equally valid.
 * @param config - Auth client configuration including endpoints, storage, and refresh settings.
 * @returns A fully configured `AuthClient` instance.
 */
export const createJWTAuthClient = <
  T extends UserProfile = UserProfile,
  TRegister extends RegisterExtraShape<TRegister> = Record<never, never>,
>(
  config: AuthClientConfig<T> = {},
): AuthClient<T, TRegister> => {
  const {
    baseURL = '',
    loginEndpoint = '/auth/login',
    logoutEndpoint = '/users/logout',
    registerEndpoint = '/auth/register',
    refreshEndpoint = '/auth/refresh',
    profileEndpoint = '/auth/profile',
    profileUpdateMethod = 'PATCH',
    profileRequestBody,
    forgotPasswordEndpoint = '/auth/password/reset',
    resetPasswordEndpoint = '/auth/password/reset/confirm',
    changePasswordEndpoint = '/auth/password/change',
    currentUserEndpoint = '/users/me',
    storagePrefix = 'molecule:auth:',
    storage: configuredStorage,
    shouldRestoreUser,
    autoRefresh = true,
    refreshBuffer = 60,
  } = config

  const logger = getLogger('auth')

  // In a browser the default is Web Storage: a session kept in memory is lost on
  // every full page load, so a `page.goto` after sign-in signs the user out
  // (xr-molecule-flash-m158: 40 of 65 local failures were this one default). SSR
  // and Node tests have no Web Storage, so they keep `'memory'`.
  const storage =
    configuredStorage ?? (hasBrowserStorage() ? createBrowserStorageAdapter() : 'memory')

  // `tokenKey` exists so something OUTSIDE this client reads the token at its own
  // key. An explicit in-memory store makes that impossible: nothing else can see
  // the value, and a reload signs the user out.
  if (config.tokenKey !== undefined && configuredStorage === 'memory') {
    logger.warn(
      `tokenKey '${config.tokenKey}' is in memory — nothing outside this client can read it and a reload signs the user out; pass storage: createBrowserStorageAdapter()`,
    )
  }

  const tokenStorage = createTokenStorage(storage, storagePrefix, config.tokenKey)
  const stateListeners = new Set<(state: AuthState<T>) => void>()
  const eventListeners = new Set<AuthEventListener>()
  let refreshTimer: ReturnType<typeof setTimeout> | null = null
  // [m95] The session restore `initialize()` started, or null when none is running.
  // Assigned SYNCHRONOUSLY, before that call's first await, so a component effect
  // running in the same tick (bootstrapApp calls initialize() and then renders)
  // already sees the restore and its HTTP requests wait for it (`whenRestored`).
  let restoreInFlight: Promise<void> | null = null
  // A profile response belongs to the session that sent it. An explicit new
  // sign-in/sign-out invalidates older profile writes, even if token strings
  // happen to match. Background profile reads do not replace the session.
  let sessionRevision = 0

  let state: AuthState<T> = {
    status: 'loading',
    initialized: false,
    authenticated: false,
    user: null,
    loading: false,
    error: null,
  }

  const notify = (): void => {
    stateListeners.forEach((callback) => callback(state))
  }

  const emitEvent = (event: AuthEvent): void => {
    eventListeners.forEach((listener) => listener(event))
  }

  /**
   * The status an update implies.
   *
   * `'loading'` means "no decision yet", so it is derived from `initialized`
   * ALONE: an auth request in flight on an initialized client (`state.loading`)
   * keeps the status the client had already decided, and a route guard that
   * unmounts while `'loading'` stays mounted for the whole request, preserving
   * form input and local validation errors when a sign-in is rejected.
   *
   * `'unavailable'` is sticky until something actually DECIDES the session: an
   * explicit status (a sign-in that succeeded, a sign-out, `validateSession`'s
   * answer) or a sign-in that newly authenticated this client. A failed login, a
   * progress update, or a profile update must not turn "the server did not
   * answer" into "nobody is signed in" — nor into "signed in" when the stored
   * token was never confirmed.
   */
  const deriveStatus = (next: AuthState<T>, explicit: AuthStatus | undefined): AuthStatus => {
    if (explicit) return explicit
    if (!next.initialized) return 'loading'
    // Progress is not a decision: a login/register/refresh/logout in flight keeps
    // the status the client already settled on.
    if (next.loading) return state.status
    // An unconfirmed session stays unconfirmed unless this update decided it —
    // `authenticated` changing is that decision (an explicit status short-circuits
    // above for every other one).
    if (
      state.status === 'unavailable' &&
      tokenStorage.getAccessToken() &&
      next.authenticated === state.authenticated
    ) {
      return 'unavailable'
    }
    if (next.authenticated) return 'authenticated'
    return 'unauthenticated'
  }

  const setState = (updates: Partial<AuthState<T>>): void => {
    const previous = state
    const next = { ...previous, ...updates }
    if (previous.authenticated && !next.authenticated) sessionRevision++
    // A user REFERENCE changes only when its data changes. A background verification
    // (`validateSession`, a reload's cookie restore) answers with a freshly parsed object that
    // usually carries exactly the data already in state; handing that new reference to every
    // subscriber re-runs every effect keyed on `user`, and a form seeded from it resets whatever
    // the user has typed since (xr-molecule-flash-m173: a Settings form wiped the test's bio
    // between `fill` and submit, so the PUT sent `"bio": ""`).
    if (updates.user !== undefined && sameUserData(updates.user, previous.user)) {
      next.user = previous.user
    }
    const nextState = { ...next, status: deriveStatus(next, updates.status) }
    state = nextState
    // Nothing the subscriber can observe changed — the same user object, the same flags: do not
    // notify. A listener that renders from this state has nothing new to render.
    const unchanged =
      previous.status === nextState.status &&
      previous.initialized === nextState.initialized &&
      previous.authenticated === nextState.authenticated &&
      previous.user === nextState.user &&
      previous.loading === nextState.loading &&
      previous.error === nextState.error
    if (!unchanged) notify()
  }

  /**
   * Whether `err` is the client's own "nothing to refresh with" error thrown by
   * `refresh()` when no refresh token is stored (and the cookie-restore fallback
   * found no session).
   */
  const isNoRefreshTokenError = (err: unknown): boolean =>
    err instanceof I18nError && err.i18nKey === 'auth.error.noRefreshToken'

  const scheduleRefresh = (): void => {
    if (!autoRefresh) return

    const token = tokenStorage.getAccessToken()
    if (!token) return

    // No refresh token means NOTHING to refresh with: cookie-session APIs (the
    // `@molecule/api-resource-user` model) issue only `{ accessToken, user }` and
    // keep the durable session in an httpOnly cookie the SERVER refreshes. A
    // timer here can only fail with `auth.error.noRefreshToken` — and it used to
    // LOG THE USER OUT on that failure while their access token was still valid
    // (a RealWorld-shaped app signed itself out right after register). Leave the
    // session alone; the API's next 401 (see `validateSession`) or an explicit
    // sign-out decides when it ends.
    if (!tokenStorage.getRefreshToken()) return

    const expiresAt = getTokenExpiration(token)
    if (!expiresAt) return

    const refreshTime = expiresAt - refreshBuffer * 1000 - Date.now()
    if (refreshTime <= 0) return

    if (refreshTimer) {
      clearTimeout(refreshTimer)
    }

    refreshTimer = setTimeout(() => {
      client.refresh().catch((err) => {
        // The refresh token can disappear between scheduling and firing (a
        // logout in another tab, a cleared store). That is not a failed refresh,
        // so it must not sign the user out: keep the session and let the API
        // reject the token if it really is dead.
        if (isNoRefreshTokenError(err)) {
          logger.debug(
            'Token refresh skipped — no refresh token stored; keeping the session until the API rejects the token',
            err,
          )
          return
        }
        // ONLY the server rejecting the refresh token (401/403) ends the session.
        // A network drop, an aborted request, or a 5xx says nothing about the
        // credential — signing out here did exactly that on every flaky refresh.
        // The API's next 401 (`validateSession`) or an explicit sign-out decides.
        const httpStatus = (err as { status?: number }).status
        if (httpStatus === 401 || httpStatus === 403) {
          logger.warn('Token refresh was rejected, signing out', err)
          void client.logout()
          return
        }
        logger.warn(
          'Token refresh failed; keeping the session until the API rejects the token',
          err,
        )
      })
    }, refreshTime)
  }

  // An API with its own auth envelope (config.requestBody / mapAuthResponse).
  const shapeBody = (kind: 'login' | 'register', payload: object): unknown =>
    config.requestBody ? config.requestBody(kind, payload as Record<string, unknown>) : payload
  let misplacedTokenReported = false
  const mapResult = (data: unknown): AuthResult<T> => {
    // With `AuthClientConfig<T>` the mapper's answer is already `AuthResult<T>`:
    // the compiler checks its user against the profile this client (and the
    // hook) hands to pages, so no cast may re-label it as `T` after mapping
    // (xr-molecule-flash-m255: the cast let a mapper drop required fields the
    // navbar read).
    if (config.mapAuthResponse) {
      const mapped = config.mapAuthResponse(data)
      try {
        if (
          !misplacedTokenReported &&
          mapped &&
          typeof mapped === 'object' &&
          'token' in mapped &&
          typeof mapped.token === 'string' &&
          mapped.token.length > 0 &&
          !mapped.accessToken
        ) {
          misplacedTokenReported = true
          logger.warn(
            '[auth] mapAuthResponse returned `token` without `accessToken`. ' +
              'The client does not store `token` as its credential. Map the credential to ' +
              '`accessToken`; cookie-auth mappings may omit it.',
          )
        }
      } catch (_error) {
        // Neither diagnostic inspection nor logging may change the auth operation's result.
      }
      return mapped
    }
    // No mapper: the API already answers in the client's own shape. JSON is
    // untyped, so this is the one place a shape must be asserted.
    return data as AuthResult<T>
  }

  /**
   * The user a current-user answer carries, passed through the SAME
   * `mapAuthResponse` that turns a login/register answer into the app's profile
   * shape. Session validation and the cookie restore adopt a user too, and their
   * answer is the raw wire user — storing it as-is replaced the adapted profile a
   * sign-in had cached, so after a reload the app was authenticated without the
   * `id`/`name` it derives from the adapter (xr-molecule-flash-m184: the username
   * and profile link disappeared although `GET /user` answered 200).
   *
   * A mapper written for a login envelope may not be able to read a bare
   * current-user answer; when it throws or yields no user, the answer is used as
   * given — exactly what every path did before this helper.
   *
   * @param data - The parsed current-user (or refresh) response body.
   * @param fallback - The user to keep when no mapping applies.
   * @returns The user in the app's profile shape.
   */
  const mapCurrentUser = (data: unknown, fallback: T | null): T | null => {
    if (!config.mapAuthResponse) return fallback
    try {
      const mapped = config.mapAuthResponse(data)
      return mapped?.user ?? fallback
    } catch (error) {
      logger.debug(
        'mapAuthResponse could not read the user in this answer; using it as given',
        error,
      )
      return fallback
    }
  }

  const fetchAPI = async <R>(endpoint: string, options: RequestInit = {}): Promise<R> => {
    const url = baseURL + endpoint
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    const token = tokenStorage.getAccessToken()
    if (token) {
      headers['Authorization'] = `${config.authScheme ?? 'Bearer'} ${token}`
    }

    // 'include' so httpOnly session cookies flow when the API is on another
    // origin (fetch defaults to 'same-origin', which silently DROPS the login
    // Set-Cookie cross-origin and breaks session restore). Safe both ways:
    // same-origin behaves identically, and the fleet CORS bond pairs a strict
    // origin allowlist with credentials:true. True cross-SITE deployments
    // additionally need SameSite=None cookies — a server deployment concern.
    const response = await fetch(url, {
      credentials: 'include',
      ...options,
      headers,
    })

    if (!response.ok) {
      // The parsed answer, kept WHOLE: the client maps `errorKey`/`error`/
      // `message` into the I18nError it throws, but every other field — a
      // RealWorld `{ errors: { credentials: ['is invalid'] } }` map, field
      // arrays, a top-level array — is preserved on `body` so the app can show
      // the server's own messages. A non-JSON body
      // (HTML error page, empty) parses to `{}`, exactly as before.
      const body: unknown = await response.json().catch(() => ({}))
      const fields = (body ?? {}) as { errorKey?: unknown; error?: unknown; message?: unknown }
      // JSON is untyped: structured validation errors belong on `body`, never
      // in the translation key or its fallback text.
      const key = typeof fields.errorKey === 'string' ? fields.errorKey : 'auth.error.requestFailed'
      const fallback =
        typeof fields.error === 'string'
          ? fields.error
          : typeof fields.message === 'string'
            ? fields.message
            : 'Request failed'
      const failure = new I18nError(key, undefined, fallback) as AuthError
      // The HTTP status, so a caller can tell "this token is dead" (401/403)
      // from "the server did not answer" (5xx, network) or "the route does not
      // exist" (404) — `validateSession` clears the session only on the first.
      failure.status = response.status
      // The response body, exactly as parsed — see {@link AuthError}.
      failure.body = body
      throw failure
    }

    const data = await response.json()
    // Compatibility shim: many @molecule/api-resource-* handlers (notably
    // the user resource) wrap the entity under `props` rather than `user`
    // (the auth-client's expected shape). Surface either so login/register
    // populate state correctly regardless of the API's wrapper convention.
    if (data && typeof data === 'object' && data.user === undefined && data.props !== undefined) {
      data.user = data.props
    }
    return data
  }

  // [M1-1] Session restore from the httpOnly cookie. The bearer token is held
  // in memory (a localStorage copy is XSS-exfiltratable, so it is forbidden)
  // and is therefore lost on a full page load — but the httpOnly session cookie
  // persists. Probe the current-user endpoint with credentials; if the cookie
  // is still valid the server returns the user, and we re-establish the
  // authenticated session WITHOUT the token ever being exposed to JavaScript.
  //
  // GATE on the non-httpOnly `mol_auth` presence hint (set by the server
  // alongside the httpOnly token): only probe when a session plausibly exists.
  // Without this gate, every anonymous caller would fire a guaranteed-401
  // request (extra API call + console error). A forged hint only costs one
  // harmless 401.
  //
  // Shared by initialize() (reload/deep-link restore) and refresh() (see the
  // no-refresh-token fallback there).
  const restoreFromSessionCookie = async (): Promise<SessionCookieRestore<T>> => {
    const hasSessionHint =
      typeof document !== 'undefined' && /(?:^|;\s*)mol_auth=1(?:;|$)/.test(document.cookie)
    if (!hasSessionHint) return { user: null, attempted: false, rejected: false }
    const revision = sessionRevision
    const token = tokenStorage.getAccessToken()
    const isCurrent = (): boolean =>
      revision === sessionRevision && token === tokenStorage.getAccessToken()
    try {
      const result = await fetchAPI<{ user?: T }>(currentUserEndpoint, {
        method: 'GET',
        credentials: 'include',
      })
      // A sign-out or account switch while this GET was pending owns the new
      // state. Neither an old profile nor an old rejection may replace it.
      if (!isCurrent()) return { user: null, attempted: false, rejected: false }
      const rawUser = (result?.user ?? null) as T | null
      // The same adapter a sign-in's answer goes through — this answer is the
      // wire shape too, and storing it raw dropped the adapted identity.
      const restoredUser = rawUser ? mapCurrentUser(result, rawUser) : null
      if (restoredUser && shouldRestoreUser && !shouldRestoreUser(restoredUser)) {
        // The server DOES have a session (e.g. an anonymous/guest one), but the
        // app says it must not count as a signed-in client. Stay logged out and
        // drop the presence hint so later loads skip the probe entirely; the
        // httpOnly session cookie is untouched and keeps authenticating API
        // calls (a guest's projects still work).
        clearSessionHintCookie()
        return { user: null, attempted: true, rejected: false }
      }
      if (restoredUser) {
        tokenStorage.setUser(restoredUser)
        setState({ status: 'authenticated', authenticated: true, user: restoredUser })
        return { user: restoredUser, attempted: true, rejected: false }
      }
      return { user: null, attempted: true, rejected: false }
    } catch (error) {
      if (!isCurrent()) return { user: null, attempted: false, rejected: false }
      const httpStatus = (error as { status?: number }).status
      // Only a REJECTED cookie (401/403) proves the hint stale: the session
      // expired server-side, or the database was reset. Drop the hint then, so
      // later loads skip a guaranteed-401 probe; the next login re-sets it.
      if (httpStatus === 401 || httpStatus === 403) {
        clearSessionHintCookie()
        return { user: null, attempted: true, rejected: true }
      }
      // Every other failure says nothing about the cookie. A 404 means the
      // configured `currentUserEndpoint` does not exist (a config error the app
      // fixes in source — the hint must survive to retry after the fix), and a
      // 5xx or a network drop is transient. Stay logged out for THIS load, but
      // keep the hint so a later load can still restore the session.
      if (httpStatus === 404) {
        logger.warn(
          `Session restore skipped — the current-user endpoint "${currentUserEndpoint}" was not found. Set currentUserEndpoint to your API's current-user route.`,
          error,
        )
      } else {
        logger.debug('Session restore skipped — the server could not confirm the cookie', error)
      }
      return {
        user: null,
        attempted: true,
        rejected: false,
        error:
          httpStatus === 404
            ? 'The current-user endpoint was not found. Serve the route or set currentUserEndpoint to it; the stored session was kept.'
            : error instanceof Error
              ? error.message
              : 'The session could not be confirmed',
      }
    }
  }

  // The body of `initialize()`, kept separate so the client can record the in-flight
  // promise SYNCHRONOUSLY (see `restoreInFlight`): a caller that awaits `initialize()`
  // still sees a rejection, while `whenRestored()` hands out a promise that resolves.
  const initializeSession = async (): Promise<void> => {
    const revision = sessionRevision
    const token = tokenStorage.getAccessToken()
    const user = tokenStorage.getUser<T>()

    if (token && user) {
      // A stored token AND a stored user ARE the session this client holds: set
      // it — synchronously, before the first `await` — so the first render is the
      // signed-in UI and no page has to wait for a verification round trip. Every
      // verification below settles BEHIND that render; only an explicit 401/403
      // ends the session (the same classification `validateSession` uses). A page
      // that waited on its own `/me` call before painting paid a full API round
      // trip on every navigation (xr-molecule-flash-m177: ~30 page loads in one
      // pagination spec, its four tests at 15.0–15.9 s of a 15 s budget).
      setState({
        initialized: true,
        authenticated: true,
        user,
      })

      if (!isTokenExpired(token)) {
        scheduleRefresh()
        return
      }

      // The token is expired, or carries no readable `exp` (an opaque session
      // token: `isTokenExpired` cannot tell). Confirm the session behind the
      // render — never in front of it.
      const refreshToken = tokenStorage.getRefreshToken()
      if (refreshToken) {
        try {
          await client.refresh()
          if (revision !== sessionRevision) return
          setState({ initialized: true })
          return
        } catch (error) {
          if (revision !== sessionRevision) return
          const httpStatus = (error as { status?: number }).status
          // Only the server REJECTING the refresh token proves the session dead.
          // A network drop or a 5xx is not about the credential, and it used to
          // sign the user out here (the m159 class).
          if (httpStatus === 401 || httpStatus === 403) {
            logger.warn('Initial token refresh was rejected; signing out', error)
            tokenStorage.clear()
            setState({
              initialized: true,
              authenticated: false,
              user: null,
              status: 'unauthenticated',
            })
            return
          }
          logger.warn(
            'Initial token refresh failed; keeping the stored session until the API rejects it',
            error,
          )
        }
      }

      // [M1-1] Cookie-restore — this is what keeps a refresh / deep-link logged
      // in under the in-memory-token model. See restoreFromSessionCookie above.
      const outcome = await restoreFromSessionCookie()
      if (revision !== sessionRevision) return
      if (outcome.rejected) {
        // The only other proof of this session was rejected by the server.
        tokenStorage.clear()
        setState({ initialized: true, authenticated: false, user: null, status: 'unauthenticated' })
        return
      }
      if (outcome.attempted && !outcome.user) {
        // The server could not confirm the session — keep the stored token and
        // user, and say the session is unconfirmed instead of signing out over a
        // network failure, a 5xx, or a misplaced current-user route.
        setState({
          initialized: true,
          status: 'unavailable',
          error: outcome.error ?? 'The session could not be confirmed',
        })
        return
      }
      // Nothing to ask (no refresh token, no cookie hint) or the cookie restored
      // the session: keep the optimistic state.
      setState({ initialized: true })
      return
    }

    // A stored token without a cached profile needs the configured current-user read.
    // Reuse its mapping, failure classification and session ownership guards.
    if (token) {
      await client.validateSession!()
      if (revision !== sessionRevision) return
      setState({ initialized: true })
      return
    }
    await restoreFromSessionCookie()
    if (revision !== sessionRevision) return
    setState({ initialized: true })
  }

  /**
   * Starts the client's ONE session restore, or returns the one already running.
   *
   * A client that nobody called `initialize()` on used to stay `'loading'` for the
   * life of the page: `createJWTAuthClient` starts at `status: 'loading'`, and only
   * `initialize()` (or a sign-in) leaves it. The template calls `initialize()` on one
   * line of `main.tsx`, so a rewrite that dropped that line made every `useAuth()`
   * read `'loading'` forever and every signed-in page never rendered (xr-molecule-flash-m192:
   * 18 tests timed out on a form the auth-gated page never produced). The first READ
   * of the client's state now starts the restore instead — lazily, so an app that
   * forgot the call still restores, and exactly once, so the explicit call and the
   * reads share one request.
   *
   * The promise is recorded BEFORE the restore's synchronous part runs: that part
   * restores a stored token and user (and notifies subscribers), so a subscriber that
   * reads the state again mid-notification must get the running restore, not start a
   * second one. An explicit `initialize()` after the restore has settled returns that
   * same settled promise rather than asking the server again.
   *
   * @returns The restore in flight, or an already-resolved promise when the client is
   *   initialized or has nothing to restore (a reused client keeps this as the
   *   `whenRestored()` signal).
   */
  const startRestoreOnce = (): Promise<void> => {
    if (restoreInFlight) return restoreInFlight
    if (state.initialized) return Promise.resolve()
    let resolve!: () => void
    let reject!: (error: unknown) => void
    const started = new Promise<void>((res, rej) => {
      resolve = res
      reject = rej
    })
    restoreInFlight = started
    initializeSession().then(resolve, reject)
    return started
  }

  const client: AuthClient<T, TRegister> = {
    getState: () => {
      // A read is what every hook does first (`useAuth()`'s snapshot, a subscriber
      // that renders from it), so a dropped `initialize()` must not leave this
      // `'loading'`. The catch keeps a restore nobody awaited from becoming an
      // unhandled rejection: the state is the answer a reader asked for.
      void startRestoreOnce().catch(() => undefined)
      return state
    },
    isAuthenticated: () => {
      void startRestoreOnce().catch(() => undefined)
      return state.authenticated
    },

    getUser: () => {
      void startRestoreOnce().catch(() => undefined)
      return state.user
    },

    getSessionRevision: () => sessionRevision,

    setUser: (user: T | null) => {
      if (user === null) sessionRevision++
      tokenStorage.setUser(user)
      setState({ user })
    },

    getAccessToken: () => tokenStorage.getAccessToken(),

    setAccessToken: (token: string | null) => {
      if (token !== tokenStorage.getAccessToken()) sessionRevision++
      tokenStorage.setAccessToken(token)
    },

    setSession: (session) => {
      sessionRevision++
      // NOT passed through `mapAuthResponse`: a seed is not an API answer, it is
      // the profile the caller already built in this client's shape. Mapping it
      // would adapt an adapted profile a second time.
      tokenStorage.setAccessToken(session.accessToken)
      if (session.refreshToken !== undefined) {
        tokenStorage.setRefreshToken(session.refreshToken)
      }
      tokenStorage.setUser(session.user)
      // The COMPLETE state, in one update and one notification: an out-of-band exchange has
      // already proved the session, so `authenticated` must flip with the token. Writing the
      // token and the user with the two field setters leaves the client signed out for every
      // shared hook (xr-molecule-flash-m178: nine navbar/profile assertions read
      // `state.authenticated` and timed out after a successful registration).
      setState({
        initialized: true,
        authenticated: true,
        loading: false,
        user: session.user,
        status: 'authenticated',
        error: null,
      })
      scheduleRefresh()
    },

    getRefreshToken: () => tokenStorage.getRefreshToken(),

    async login(credentials: LoginCredentials): Promise<AuthResult<T>> {
      setState({ loading: true, error: null })

      try {
        const result = mapResult(
          await fetchAPI<unknown>(loginEndpoint, {
            method: 'POST',
            body: JSON.stringify(shapeBody('login', credentials)),
          }),
        )

        // Two-factor gate: the server answered 206 `{ twoFactorRequired: true }`
        // — no tokens/user issued. Surface the result WITHOUT marking the
        // session authenticated; the caller re-prompts for the TOTP and retries.
        if (result.twoFactorRequired) {
          setState({ loading: false })
          return result
        }

        sessionRevision++
        tokenStorage.setAccessToken(result.accessToken || null)
        tokenStorage.setRefreshToken(result.refreshToken || null)
        tokenStorage.setUser(result.user)

        setState({
          status: 'authenticated',
          loading: false,
          authenticated: true,
          user: result.user,
        })

        logger.debug('User logged in')
        emitEvent({ type: 'login', user: result.user })
        scheduleRefresh()

        return result
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Login failed'
        setState({ loading: false, error })
        emitEvent({ type: 'error', error })
        throw err
      }
    },

    async logout(): Promise<void> {
      sessionRevision++
      setState({ loading: true })

      try {
        // [M1-1] The persistent credential is the httpOnly session cookie, not
        // the in-memory bearer token. The bearer does not survive a page reload
        // (after a reload `initialize()` restores `authenticated` from the cookie
        // but cannot repopulate the in-memory token), so guarding the server
        // logout on `token` alone meant a reloaded session could never log out
        // server-side and the httpOnly cookie lived on. Call the endpoint
        // whenever we believe a session exists — token OR restored-authenticated —
        // and send `credentials` so the cookie authenticates the device
        // revocation and the server clears the httpOnly cookie.
        const token = tokenStorage.getAccessToken()
        if (logoutEndpoint && (token || state.authenticated)) {
          await fetchAPI(logoutEndpoint, { method: 'POST', credentials: 'include' }).catch(
            (err) => {
              logger.debug('Logout endpoint call failed (non-critical)', err)
            },
          )
        }
      } finally {
        if (refreshTimer) {
          clearTimeout(refreshTimer)
          refreshTimer = null
        }

        tokenStorage.clear()
        // [M1-1] Drop the non-httpOnly session-presence hint so initialize()
        // won't probe for cookie-restore on the next load even if the server
        // logout call didn't complete (the server clears it too, on success).
        clearSessionHintCookie()
        setState({
          initialized: true,
          loading: false,
          authenticated: false,
          user: null,
          // An explicit sign-out settles the question, whatever came before.
          status: 'unauthenticated',
        })
        logger.debug('User logged out')
        emitEvent({ type: 'logout' })
      }
    },

    async register(data: RegisterData<TRegister>): Promise<AuthResult<T>> {
      setState({ loading: true, error: null })

      try {
        const result = mapResult(
          await fetchAPI<unknown>(registerEndpoint, {
            method: 'POST',
            body: JSON.stringify(shapeBody('register', data)),
          }),
        )

        sessionRevision++
        tokenStorage.setAccessToken(result.accessToken || null)
        tokenStorage.setRefreshToken(result.refreshToken || null)
        tokenStorage.setUser(result.user)

        setState({
          status: 'authenticated',
          loading: false,
          authenticated: true,
          user: result.user,
        })

        emitEvent({ type: 'register', user: result.user })
        scheduleRefresh()

        return result
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Registration failed'
        setState({ loading: false, error })
        emitEvent({ type: 'error', error })
        throw err
      }
    },

    async refresh(): Promise<AuthResult<T>> {
      const refreshToken = tokenStorage.getRefreshToken()
      if (!refreshToken) {
        // Cookie-session APIs (the @molecule/api-resource-user model) issue NO
        // refresh token at all — login/register return only { accessToken, user }
        // and the durable credential is the httpOnly session cookie. For them,
        // "refresh" means re-deriving the session from that cookie, exactly like
        // initialize()'s restore. Without this fallback every post-auth refresh
        // (the auth modal's finishAuth, the upgrade-tab focus-return) threw
        // 'No refresh token available' — which silently aborted the modal's
        // signup/login flow right after the account was created.
        const outcome = await restoreFromSessionCookie()
        if (outcome.user) {
          emitEvent({ type: 'refresh' })
          return { user: outcome.user }
        }
        throw new I18nError('auth.error.noRefreshToken', undefined, 'No refresh token available')
      }

      const result = await fetchAPI<AuthResult<T>>(refreshEndpoint, {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      })

      // The refresh answer carries the user too, in the same wire shape a
      // sign-in's does — route it through the same mapper so a token refresh
      // cannot replace the adapted profile with the raw one.
      const user = mapCurrentUser(result, (result?.user ?? null) as T | null)
      tokenStorage.setAccessToken(result.accessToken || null)
      if (result.refreshToken) {
        tokenStorage.setRefreshToken(result.refreshToken)
      }
      if (user) tokenStorage.setUser(user)

      setState({
        status: 'authenticated',
        authenticated: true,
        user,
      })

      emitEvent({ type: 'refresh' })
      scheduleRefresh()

      return { ...result, user: user ?? result.user }
    },

    async requestPasswordReset(data: PasswordResetRequest): Promise<void> {
      await fetchAPI(forgotPasswordEndpoint, {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },

    async confirmPasswordReset(data: PasswordResetConfirm): Promise<void> {
      await fetchAPI(resetPasswordEndpoint, {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },

    async updateProfile(data: Partial<T>): Promise<T> {
      const revision = sessionRevision
      // The REQUEST transport is configurable (`profileUpdateMethod` /
      // `profileRequestBody`); everything below — mapping the answer, storing
      // the user, notifying subscribers — is the same session state for every
      // transport, so a PUT/enveloped API does not need a hand-written client.
      // Defaults keep the resource-style PATCH with bare data.
      const profileUser = state.user
      if (typeof profileEndpoint === 'function' && !profileUser)
        throw new I18nError(
          'auth.error.unauthorized',
          undefined,
          'Sign in before updating a profile',
        )
      const endpoint =
        typeof profileEndpoint === 'function' ? profileEndpoint(profileUser!) : profileEndpoint
      if (
        typeof profileEndpoint === 'function' &&
        (typeof endpoint !== 'string' || !endpoint.trim())
      )
        throw new TypeError('profileEndpoint must resolve to a nonempty route')
      const body = profileRequestBody ? profileRequestBody(data) : data
      // Body adapters may return custom serializers; finish caller code before
      // checking which session will authorize the request.
      const serializedBody = JSON.stringify(body)
      if (revision !== sessionRevision)
        throw new I18nError(
          'auth.error.unauthorized',
          undefined,
          'The profile session changed before submission',
        )
      const answer = await fetchAPI<T>(endpoint, {
        method: profileUpdateMethod,
        body: serializedBody,
      })

      // The profile route answers in one of three shapes: a bare user, `{ user }`, or
      // the resource envelope `{ props }` (which `fetchAPI` aliases onto `user`).
      // The profile the app stores is the USER, never the envelope around it —
      // caching the envelope meant every page reading `user.name` read `undefined`
      // right after a successful save (the settings-edit class).
      const unwrapped = answer as T & { user?: T }
      const raw = unwrapped.user ?? answer
      // The profile route answers the wire shape as well; map it like every
      // other answer that replaces the cached user.
      const user = mapCurrentUser(answer, raw) ?? raw
      // The server may have accepted the old account's update, but that answer
      // must never replace a signed-out or newly signed-in account's cached
      // user. Return the request's result while leaving the current session
      // (storage and subscribers) untouched.
      if (revision !== sessionRevision) return user
      tokenStorage.setUser(user)
      setState({ user })

      return user
    },

    async changePassword(oldPassword: string, newPassword: string): Promise<void> {
      // Server handler (@molecule/api-resource-user `updatePassword`)
      // reads `currentPassword`; legacy callers passed `oldPassword`,
      // so accept either name in the hook signature but translate to
      // the canonical `currentPassword` field when sending.
      await fetchAPI(changePasswordEndpoint, {
        method: 'POST',
        body: JSON.stringify({ currentPassword: oldPassword, newPassword }),
      })
    },

    async initialize(): Promise<void> {
      // Shared with every state read: the first of them starts the one restore, and a
      // second `initialize()` (or one issued after a lazy read already restored)
      // awaits the same promise instead of sending a second request.
      await startRestoreOnce()
    },

    whenRestored(): Promise<void> {
      // Resolve, never reject: this is awaited before every authenticated request, so a
      // restore that failed must not turn into a rejected request — the request goes out
      // unauthenticated instead (the same outcome as not waiting at all).
      return restoreInFlight ? restoreInFlight.catch(() => undefined) : Promise.resolve()
    },

    async validateSession(): Promise<void> {
      const token = tokenStorage.getAccessToken()
      if (!token) {
        setState({
          initialized: true,
          authenticated: false,
          user: null,
          status: 'unauthenticated',
        })
        return
      }
      const revision = sessionRevision
      const isCurrent = (): boolean =>
        revision === sessionRevision && token === tokenStorage.getAccessToken()
      try {
        // `fetchAPI` sends the stored token, so this asks the server "is this
        // session still valid?" — the background check `initialize()` does not do
        // (it restores from storage without a request by design).
        const result = await fetchAPI<{ user?: T }>(currentUserEndpoint, { method: 'GET' })
        if (!isCurrent()) return
        // The answer is the wire user, not the app's adapted profile: pass it
        // through the same `mapAuthResponse` a sign-in uses before storing it
        // (xr-molecule-flash-m184 — a reload replaced the adapted user with the
        // raw one and the profile link disappeared).
        const user = mapCurrentUser(result, (result?.user ?? tokenStorage.getUser<T>()) as T | null)
        if (user) {
          tokenStorage.setUser(user)
          setState({
            initialized: true,
            authenticated: true,
            user,
            status: 'authenticated',
            error: null,
          })
        } else {
          tokenStorage.clear()
          setState({
            initialized: true,
            authenticated: false,
            user: null,
            status: 'unauthenticated',
          })
        }
      } catch (error) {
        if (!isCurrent()) return
        const httpStatus = (error as { status?: number }).status
        // ONLY 401 and 403 are the server rejecting this token (revoked, expired,
        // a reset database): drop the session rather than keep sending a header
        // the server refuses. Any other status is not about the credential —
        // most importantly a 404, which means `currentUserEndpoint` does not
        // exist on this API. A route-not-found neither verifies nor rejects the
        // token, so clearing it here signed every user out of a working session
        // over a configuration mistake.
        if (httpStatus === 401 || httpStatus === 403) {
          tokenStorage.clear()
          setState({
            initialized: true,
            authenticated: false,
            user: null,
            status: 'unauthenticated',
          })
          return
        }
        // The server could not confirm the session. Keep the token AND the user
        // so a later reload or a retry can restore them; say so with
        // `unavailable` instead of signing the user out over a network failure,
        // a 5xx, or a misplaced current-user route.
        const message =
          httpStatus === 404
            ? "The current-user endpoint was not found. Set currentUserEndpoint to your API's current-user route; the stored token was kept."
            : error instanceof Error
              ? error.message
              : 'Session could not be confirmed'
        if (httpStatus === 404) {
          logger.warn(
            `validateSession could not verify the session — the current-user endpoint "${currentUserEndpoint}" was not found. Set currentUserEndpoint to your API's current-user route; the stored token was kept.`,
            error,
          )
        }
        setState({ status: 'unavailable', error: message })
      }
    },

    subscribe(callback: (state: AuthState<T>) => void): () => void {
      // Subscribing is a read of the state in all but name: a component that only
      // subscribes (and renders from the callback) must get a decision, not a
      // permanent `'loading'` (see `startRestoreOnce`).
      void startRestoreOnce().catch(() => undefined)
      stateListeners.add(callback)
      return () => stateListeners.delete(callback)
    },

    onAuthChange(callback: (state: AuthState<T>) => void): () => void {
      void startRestoreOnce().catch(() => undefined)
      stateListeners.add(callback)
      return () => stateListeners.delete(callback)
    },

    getToken(): string | null {
      return tokenStorage.getAccessToken()
    },

    addEventListener(listener: AuthEventListener): () => void {
      eventListeners.add(listener)
      return () => eventListeners.delete(listener)
    },

    destroy(): void {
      if (refreshTimer) {
        clearTimeout(refreshTimer)
        refreshTimer = null
      }
      stateListeners.clear()
      eventListeners.clear()
    },
  }

  return client
}
