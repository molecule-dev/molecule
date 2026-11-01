/**
 * Auth client creation and management.
 *
 * Provides the JWT-based auth client implementation.
 *
 * @module
 */

import {
  type FullRequestConfig,
  HttpError,
  type HttpResponse,
  snapshotHttpErrorResponse,
} from '@molecule/app-http'
import { I18nError } from '@molecule/app-i18n'
import { getLogger, redactCredentials, snapshotCredentials } from '@molecule/app-logger'

import { createBrowserStorageAdapter } from './browser-storage.js'
import { createTokenStorage, getTokenExpiration, isTokenExpired } from './token.js'
import type {
  AuthClient,
  AuthClientConfigOptions,
  AuthError,
  AuthEvent,
  AuthEventListener,
  AuthProfileConstraint,
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

const HTTP_ERROR_BRAND = Symbol.for('@molecule/app-http/HttpError')
const ERROR_DATA_FIELDS = new Set(['name', 'message', 'stack', 'cause', 'errors'])

/** Copy only detached data onto the fresh error's public and diagnostic fields. */
const copyFailureSnapshot = (
  error: Error,
  snapshot: Record<string, unknown>,
  preserveHttpMetadata = false,
): void => {
  for (const [key, value] of Object.entries(snapshot)) {
    if (preserveHttpMetadata && (key === 'response' || key === 'config')) continue
    Object.defineProperty(error, key, {
      value,
      enumerable: !ERROR_DATA_FIELDS.has(key),
      configurable: true,
      writable: true,
    })
  }
  if (
    Object.getOwnPropertySymbols(snapshot).includes(HTTP_ERROR_BRAND) &&
    Reflect.get(error, HTTP_ERROR_BRAND) !== true
  ) {
    Object.defineProperty(error, HTTP_ERROR_BRAND, { value: true })
  }
}

const hasHttpErrorBrand = (failure: unknown): failure is object =>
  failure !== null &&
  (typeof failure === 'object' || typeof failure === 'function') &&
  Object.getOwnPropertyDescriptor(failure, HTTP_ERROR_BRAND)?.value === true

/** Capture every non-response field on the original error, preserving native stacks and receivers. */
const snapshotHttpFailureFields = (
  failure: object,
  response: HttpResponse | undefined,
): Record<string, unknown> => {
  const originalFields = new Error() as unknown as Record<string, unknown>
  const visited = new Set<string>()
  for (const key of [...ERROR_DATA_FIELDS, ...Reflect.ownKeys(failure)]) {
    if (key === 'response') continue
    if (typeof key === 'string') {
      if (visited.has(key)) continue
      visited.add(key)
    }
    let value: unknown
    try {
      value = Reflect.get(failure, key) as unknown
    } catch (_error) {
      value = '[ACCESSOR_ERROR]'
    }
    Object.defineProperty(originalFields, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true,
    })
  }
  const snapshot = snapshotCredentials(originalFields) as Record<string, unknown>
  Object.defineProperty(snapshot, 'response', {
    value: response,
    enumerable: true,
    configurable: true,
    writable: true,
  })
  return snapshot
}

/** Snapshot once, scrub the detached data, and never let the original failure escape. */
const snapshotAuthFailure = async (failure: unknown): Promise<Error> => {
  const httpFailure = hasHttpErrorBrand(failure)
  let capturedResponse: HttpResponse | undefined
  if (httpFailure) {
    try {
      const originalResponse = (failure as HttpError).response
      capturedResponse = originalResponse
        ? await snapshotHttpErrorResponse(originalResponse)
        : undefined
    } catch (_unreadableResponse) {
      capturedResponse = undefined
    }
  }

  const snapshot = httpFailure
    ? snapshotHttpFailureFields(failure, capturedResponse)
    : snapshotCredentials(failure)
  const data = (
    snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot) ? snapshot : {}
  ) as Record<string, unknown>
  const message =
    typeof data.message === 'string'
      ? data.message
      : typeof snapshot === 'string'
        ? snapshot
        : 'Authentication failed'
  let error: Error
  if (failure instanceof I18nError && typeof data.i18nKey === 'string') {
    error = new I18nError(data.i18nKey, data.i18nValues as I18nError['i18nValues'], message)
  } else if (httpFailure) {
    error = new HttpError(
      message,
      typeof data.status === 'number' ? data.status : 0,
      capturedResponse ?? (data.response as HttpResponse | undefined),
      data.config as FullRequestConfig | undefined,
      typeof data.errorKey === 'string' ? data.errorKey : undefined,
      data.aborted === true,
    )
  } else if (failure instanceof AggregateError) {
    error = new AggregateError(Array.isArray(data.errors) ? data.errors : [], message)
  } else if (failure instanceof TypeError) {
    error = new TypeError(message)
  } else {
    error = new Error(message)
  }
  copyFailureSnapshot(error, data, error instanceof HttpError)
  if (httpFailure) {
    Object.defineProperty(error, 'response', {
      value: capturedResponse ?? (data.response as HttpResponse | undefined),
      enumerable: true,
      configurable: true,
      writable: true,
    })
  }
  return error
}

/** Give every auth operation the same detached, fresh-failure boundary. */
const runAuthOperation = async <R>(operation: () => Promise<R>): Promise<R> => {
  try {
    return await operation()
  } catch (error) {
    throw await snapshotAuthFailure(error)
  }
}

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
  /** The original request error, including its HTTP status and response body. */
  failure?: unknown
  /** A newer session or profile write superseded this read. */
  stale?: boolean
  /** The application explicitly declined the server's restored user. */
  declined?: boolean
}

/** A JSON object of named fields — the only shape a profile or a profile answer can patch. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * The profile a successful profile save leaves the session with: the answer applied field by
 * field onto the profile the save was sent for.
 *
 * `updateProfile()` sends a partial update. An API may answer it with the CHANGED fields only —
 * `@molecule/api-resource-user` answers `{ props: { bio, updatedAt } }`, an account API
 * `{ account: { displayName } }`, a mutation `{ id, displayName }` — or with the whole profile,
 * and no field tells the two apart: an `id` can come with a partial answer, and a mapper may
 * derive one from a changed field. So each field the answer carries replaces the current value
 * (an explicit `null` clears it, `id` included), and each field it does not carry is kept —
 * including one a field-by-field mapper read as `undefined` from a partial wire user. A whole
 * answer therefore gives its own values, and keeps a field it leaves out: an API that clears a
 * field by omitting it must answer (or map) that field as `null`. Nothing reads a profile field,
 * so a profile type with or without an `id` is applied the same way.
 *
 * An answer that is not a JSON object, or a save with no profile to apply it to, is returned as
 * it came.
 *
 * @param profile - The profile the save was applied to.
 * @param answer - The mapped profile answer.
 * @returns The saved profile.
 */
const applyProfileAnswer = <T>(profile: T | null, answer: T): T => {
  if (!isRecord(profile) || !isRecord(answer)) return answer
  const carried = Object.entries(answer).filter(([, value]) => value !== undefined)
  return { ...profile, ...Object.fromEntries(carried) }
}

/**
 * Creates a simple JWT-based auth client.
 *
 * This is a basic implementation that can be extended or replaced
 * with more sophisticated auth providers.
 *
 * `T` is the profile the API returns. The default, `UserProfile`, requires
 * `id: string`, and an untyped call — `createJWTAuthClient({ mapAuthResponse })`
 * — KEEPS that default: the profile is never inferred from the config (no
 * member of it, and not from an annotated config variable), so a mapper that
 * returns a user without `id` fails to compile instead of quietly becoming the
 * client's profile. To use the app's own profile, name it here,
 * `createJWTAuthClient<SessionUser>(config)`; a profile with no `id`
 * (`{ username, email, bio, image }`) is then used as-is. Pass the same type to
 * the config (`AuthClientConfig<SessionUser>`), so `mapAuthResponse` and the
 * write transport are checked against the profile the client and the React
 * hooks hand to your pages.
 *
 * `any` is accepted (`createJWTAuthClient<any>()`) as the caller's explicit
 * opt-out; array, function and `Date` profiles are rejected. A wrapper that
 * forwards a profile type copies `AuthProfileConstraint` (see
 * {@link AuthClientConfig}'s migration note).
 *
 * @template T - The user profile the API returns: a JSON object type of named
 *   fields (see {@link AuthProfileConstraint}), including a profile with no `id`.
 *   The default, `UserProfile`, requires `id: string`.
 * @template TRegister - The app's own registration fields, accepted at the top
 *   level of `register()` (e.g. `{ username: string }` for an account API).
 *   An interface and a type alias are equally valid.
 * @param config - Auth client configuration including endpoints, storage, and refresh settings.
 * @returns A fully configured `AuthClient` instance.
 */
export const createJWTAuthClient = <
  T extends AuthProfileConstraint<T> = UserProfile,
  TRegister extends RegisterExtraShape<TRegister> = Record<never, never>,
>(
  config: NoInfer<AuthClientConfigOptions<T>> = {},
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
    changePasswordMethod = 'POST',
    currentUserEndpoint = '/users/me',
    cookieRestore = 'hint',
    storagePrefix = 'molecule:auth:',
    storage: configuredStorage,
    shouldRestoreUser,
    autoRefresh = true,
    refreshBuffer = 60,
  } = config

  const logger = getLogger('auth')

  // In a browser the default is Web Storage: a session kept in memory is lost on
  // every full page load, so a `page.goto` after sign-in signs the user out
  // SSR and Node tests have no Web Storage, so they keep `'memory'`.
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
  const signOutMarkerKey = `${storagePrefix}signedOut`
  let memorySignOutMarker: string | null = null
  const getSignOutMarker = (): string | null =>
    typeof storage === 'object' ? storage.getItem(signOutMarkerKey) : memorySignOutMarker
  const setSignOutMarker = (): void => {
    if (typeof storage === 'object') storage.setItem(signOutMarkerKey, '1')
    else memorySignOutMarker = '1'
  }
  const clearSignOutMarker = (): void => {
    if (typeof storage === 'object') storage.removeItem(signOutMarkerKey)
    else memorySignOutMarker = null
  }
  const stateListeners = new Set<(state: AuthState<T>) => void>()
  const eventListeners = new Set<AuthEventListener<T>>()
  let refreshTimer: ReturnType<typeof setTimeout> | null = null
  // The session restore `initialize()` started, or null when none is running.
  // Assigned SYNCHRONOUSLY, before that call's first await, so a component effect
  // running in the same tick (bootstrapApp calls initialize() and then renders)
  // already sees the restore and its HTTP requests wait for it (`whenRestored`).
  let restoreInFlight: Promise<void> | null = null
  // A profile response belongs to the session that sent it. An explicit new
  // sign-in/sign-out invalidates older profile writes, even if token strings
  // happen to match. Background profile reads do not replace the session.
  let sessionRevision = 0
  // Accepted profile writes also own the cached profile: a read captured before
  // one must not restore the older record after the save has been published.
  let profileRevision = 0
  let pendingSessionOperations = 0
  let lastSignOutRevision = -1
  // A cookie can authenticate without a script-readable bearer or presence hint.
  // Keep its candidacy until a session decision, independently of token storage.
  let cookieSessionCandidate = false

  /**
   * Runs every asynchronous session operation under the epoch that started it.
   * The pending count makes an otherwise settled-looking anonymous client a
   * session candidate for `setUser(null)`; the guard owns every later effect.
   */
  const runSessionOperation = async <R>(
    callback: (operation: { revision: number; isCurrent: () => boolean }) => Promise<R>,
  ): Promise<R> => {
    const revision = sessionRevision
    const operation = { revision, isCurrent: () => revision === sessionRevision }
    pendingSessionOperations++
    try {
      return await runAuthOperation(() => callback(operation))
    } finally {
      pendingSessionOperations--
    }
  }

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

  const emitEvent = (event: AuthEvent<T>): void => {
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
      (tokenStorage.getAccessToken() || cookieSessionCandidate) &&
      next.authenticated === state.authenticated
    ) {
      return 'unavailable'
    }
    if (next.authenticated) return 'authenticated'
    return 'unauthenticated'
  }

  const setState = (updates: Partial<AuthState<T>>, revisionAdvanced = false): void => {
    const previous = state
    const next = { ...previous, ...updates }
    if (previous.authenticated && !next.authenticated && !revisionAdvanced) sessionRevision++
    // A user REFERENCE changes only when its data changes. A background verification
    // (`validateSession`, a reload's cookie restore) answers with a freshly parsed object that
    // usually carries exactly the data already in state; handing that new reference to every
    // subscriber re-runs every effect keyed on `user`, and a form seeded from it resets whatever
    // the user has typed since, replacing unsaved form input with cached data.
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

  /** Ends local ownership before any cleanup, so older operations cannot publish. */
  const endLocalSession = (): void => {
    sessionRevision++
    lastSignOutRevision = sessionRevision
    setSignOutMarker()
    if (refreshTimer) {
      clearTimeout(refreshTimer)
      refreshTimer = null
    }
    tokenStorage.clear()
    cookieSessionCandidate = false
    clearSessionHintCookie()
    setState(
      {
        initialized: true,
        loading: false,
        authenticated: false,
        user: null,
        status: 'unauthenticated',
      },
      true,
    )
  }

  /**
   * Whether `err` is the client's own "nothing to refresh with" error thrown by
   * `refresh()` when no refresh token is stored (and the cookie-restore fallback
   * found no session).
   */
  const isNoRefreshTokenError = (err: unknown): boolean =>
    err instanceof I18nError && err.i18nKey === 'auth.error.noRefreshToken'

  const scheduleRefresh = (retryAfterTransient = false): void => {
    if (!autoRefresh) return

    const token = tokenStorage.getAccessToken()
    if (!token) return

    // No refresh token means NOTHING to refresh with: cookie-session APIs (the
    // `@molecule/api-resource-user` model) issue only `{ accessToken, user }` and
    // keep the durable session in an httpOnly cookie the SERVER refreshes. A
    // timer here can only fail with `auth.error.noRefreshToken` — and it used to
    // LOG THE USER OUT on that failure while their access token was still valid
    // (an app without refresh tokens signed itself out right after register). Leave the
    // session alone; the API's next 401 (see `validateSession`) or an explicit
    // sign-out decides when it ends.
    if (!tokenStorage.getRefreshToken()) return

    const expiresAt = getTokenExpiration(token)
    if (!expiresAt) return

    // A transient failure must not consume the one timer permanently: the
    // original expiry-based instant has already passed, so retry on a bounded
    // delay while retaining the session as `unavailable`. A success replaces
    // this retry with the new token's normal expiry-based schedule.
    const refreshTime = retryAfterTransient ? 30_000 : expiresAt - refreshBuffer * 1000 - Date.now()
    if (refreshTime <= 0) return

    if (refreshTimer) {
      clearTimeout(refreshTimer)
    }

    refreshTimer = setTimeout(() => {
      void runSessionOperation(async (operation) => {
        try {
          await client.refresh()
        } catch (err) {
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
          // ONLY a current server rejection ends the session. An old timer's
          // 401 must not destroy a login that replaced it while it was pending.
          if (!operation.isCurrent()) return
          const httpStatus = (err as { status?: number }).status
          if ((httpStatus === 401 || httpStatus === 403) && operation.isCurrent()) {
            logger.warn('Token refresh was rejected, signing out', err)
            await client.logout()
            return
          }
          logger.warn('Token refresh failed; keeping the session and scheduling a retry', err)
          scheduleRefresh(true)
        }
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
    // while keeping the custom fields that consumers read.
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
      return mapped as AuthResult<T>
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
   * `id`/`name` it derives from the adapter: the username and profile link
   * disappear although `GET /user` answered 200.
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

  const fetchAPI = async <R>(endpoint: string, options: RequestInit = {}): Promise<R> =>
    runAuthOperation(async () => {
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
        // The parsed answer keeps its complete shape: the client maps `errorKey`/`error`/
        // `message` into the I18nError it throws, and every other field — a structured
        // `{ errors: { credentials: ['is invalid'] } }` map, field arrays, a top-level array —
        // remains on `body` so the app can show the server's own messages. Credential values
        // are redacted in place; non-secret values are unchanged. A non-JSON body (HTML error
        // page, empty) parses to `{}`, exactly as before.
        const body: unknown = redactCredentials(await response.json().catch(() => ({})))
        const fields = (body ?? {}) as { errorKey?: unknown; error?: unknown; message?: unknown }
        // JSON is untyped: structured validation errors belong on `body`, never
        // in the translation key or its fallback text.
        const key =
          typeof fields.errorKey === 'string' ? fields.errorKey : 'auth.error.requestFailed'
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
        // The response body with credential values redacted — see {@link AuthError}.
        failure.body = body
        // Mirror app-http's failed-response view without importing it. Keep the
        // original auth fields above intact: both documented readings now work on
        // the SAME rejection, including across duplicated package copies.
        const headers: Record<string, string> = {}
        response.headers.forEach((value, name) => {
          headers[name] = value
        })
        failure.response = {
          data: body,
          status: response.status,
          statusText: response.statusText,
          headers: redactCredentials({ headers }).headers,
          // RequestInit bodies contain passwords and refresh tokens, and its
          // headers contain bearer/cookie credentials. Method and a credential-
          // redacted URL are the complete request view an auth rejection may expose.
          config: {
            method: (options.method ?? 'GET').toUpperCase(),
            url: redactCredentials(url),
          },
        }
        failure.errorKey = key
        failure.aborted = false
        Object.defineProperty(failure, HTTP_ERROR_BRAND, { value: true })
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
    })

  /**
   * A stale credential exchange can set an HttpOnly cookie even when its local
   * result is ignored. If its sign-out still owns this client, revoke those late
   * credentials without delaying the caller. Never revoke a replacement session.
   */
  const discardLateSession = (
    operation: { revision: number; isCurrent: () => boolean },
    result: AuthResult<T>,
  ): void => {
    if (
      operation.isCurrent() ||
      state.authenticated ||
      lastSignOutRevision <= operation.revision ||
      !getSignOutMarker() ||
      result.twoFactorRequired
    ) {
      return
    }
    clearSessionHintCookie()
    if (!logoutEndpoint) return
    const accessToken = result.accessToken
    void runSessionOperation(async (cleanup) => {
      try {
        await fetchAPI(logoutEndpoint, {
          method: 'POST',
          credentials: 'include',
          headers: accessToken
            ? { Authorization: `${config.authScheme ?? 'Bearer'} ${accessToken}` }
            : {},
        })
      } catch (error) {
        logger.debug('Late session revocation failed (non-critical)', error)
      } finally {
        if (cleanup.isCurrent() && !state.authenticated && getSignOutMarker()) {
          clearSessionHintCookie()
        }
      }
    })
  }

  // Session restore from the httpOnly cookie. The bearer token is held
  // in memory (a localStorage copy is XSS-exfiltratable, so it is forbidden)
  // and is therefore lost on a full page load — but the httpOnly session cookie
  // persists. Probe the current-user endpoint with credentials; if the cookie
  // is still valid the server returns the user, and we re-establish the
  // authenticated session WITHOUT the token ever being exposed to JavaScript.
  //
  // By default, use the readable `mol_auth=1` hint to avoid probing every anonymous
  // load. External cookie APIs can opt into `cookieRestore: 'always'`. Once this
  // client has a candidate, retries do not depend on the hint remaining readable.
  //
  // Shared by initialize() (reload/deep-link restore) and refresh() (see the
  // no-refresh-token fallback there).
  const restoreFromSessionCookie = async (): Promise<SessionCookieRestore<T>> =>
    runSessionOperation(async (operation) => {
      if (getSignOutMarker()) {
        clearSessionHintCookie()
        return { user: null, attempted: false, rejected: false }
      }
      const hasSessionHint =
        typeof document !== 'undefined' && /(?:^|;\s*)mol_auth=1(?:;|$)/.test(document.cookie)
      if (!hasSessionHint && !cookieSessionCandidate && cookieRestore !== 'always') {
        return { user: null, attempted: false, rejected: false }
      }
      cookieSessionCandidate = true
      const token = tokenStorage.getAccessToken()
      const readProfileRevision = profileRevision
      const isCurrent = (): boolean =>
        operation.isCurrent() &&
        token === tokenStorage.getAccessToken() &&
        readProfileRevision === profileRevision
      try {
        const result = await fetchAPI<{ user?: T }>(currentUserEndpoint, {
          method: 'GET',
          credentials: 'include',
        })
        // A sign-out or account switch while this GET was pending owns the new
        // state. Neither an old profile nor an old rejection may replace it.
        if (!isCurrent()) return { user: null, attempted: false, rejected: false, stale: true }
        const rawUser = (result?.user ?? null) as T | null
        // The same adapter a sign-in's answer goes through — this answer is the
        // wire shape too, and storing it raw dropped the adapted identity.
        const restoredUser = mapCurrentUser(result, rawUser)
        // The mapper and restore predicate are caller code and can end or replace
        // the session synchronously. Re-check ownership after both, before any write.
        if (!isCurrent()) return { user: null, attempted: false, rejected: false, stale: true }
        if (restoredUser && shouldRestoreUser) {
          const restore = shouldRestoreUser(restoredUser)
          if (!isCurrent()) return { user: null, attempted: false, rejected: false, stale: true }
          if (!restore) {
            // The server DOES have a session (e.g. an anonymous/guest one), but the
            // app says it must not count as a signed-in client. Stay logged out and
            // drop the presence hint so later loads skip the probe entirely; the
            // httpOnly session cookie is untouched and keeps authenticating API
            // calls (a guest's projects still work).
            clearSessionHintCookie()
            cookieSessionCandidate = false
            return { user: null, attempted: true, rejected: false, declined: true }
          }
        }
        if (restoredUser) {
          clearSignOutMarker()
          tokenStorage.setUser(restoredUser)
          setState({
            status: 'authenticated',
            authenticated: true,
            user: restoredUser,
            error: null,
          })
          return { user: restoredUser, attempted: true, rejected: false }
        }
        return { user: null, attempted: true, rejected: false }
      } catch (error) {
        if (!isCurrent()) return { user: null, attempted: false, rejected: false, stale: true }
        const httpStatus = (error as { status?: number }).status
        // Only a REJECTED cookie (401/403) proves the hint stale: the session
        // expired server-side, or the database was reset. Drop the hint then, so
        // later loads skip a guaranteed-401 probe; the next login re-sets it.
        if (httpStatus === 401 || httpStatus === 403) {
          clearSessionHintCookie()
          cookieSessionCandidate = false
          return { user: null, attempted: true, rejected: true, failure: error }
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
          failure: error,
          error:
            httpStatus === 404
              ? 'The current-user endpoint was not found. Serve the route or set currentUserEndpoint to it; the stored session was kept.'
              : error instanceof Error
                ? error.message
                : 'The session could not be confirmed',
        }
      }
    })

  // The body of `initialize()`, kept separate so the client can record the in-flight
  // promise SYNCHRONOUSLY (see `restoreInFlight`): a caller that awaits `initialize()`
  // still sees a rejection, while `whenRestored()` hands out a promise that resolves.
  const initializeSession = async (): Promise<void> =>
    runSessionOperation(async (operation) => {
      if (getSignOutMarker()) {
        endLocalSession()
        return
      }
      const token = tokenStorage.getAccessToken()
      const user = tokenStorage.getUser<T>()

      if (token && user) {
        // A stored token AND a stored user ARE the session this client holds: set
        // it — synchronously, before the first `await` — so the first render is the
        // signed-in UI and no page has to wait for a verification round trip. Every
        // verification below settles BEHIND that render; only an explicit 401/403
        // ends the session (the same classification `validateSession` uses). A page
        // that waited on its own `/me` call before painting paid a full API round
        // trip on every navigation.
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
            if (!operation.isCurrent()) return
            setState({ initialized: true })
            return
          } catch (error) {
            if (!operation.isCurrent()) return
            const httpStatus = (error as { status?: number }).status
            // Only the server REJECTING the refresh token proves the session dead.
            // A network drop or a 5xx is not about the credential, and it used to
            // sign the user out here.
            if (httpStatus === 401 || httpStatus === 403) {
              logger.warn('Initial token refresh was rejected; signing out', error)
              endLocalSession()
              return
            }
            logger.warn(
              'Initial token refresh failed; keeping the stored session until the API rejects it',
              error,
            )
          }
        }

        // Cookie-restore — this is what keeps a refresh / deep-link logged
        // in under the in-memory-token model. See restoreFromSessionCookie above.
        const outcome = await restoreFromSessionCookie()
        if (!operation.isCurrent()) return
        if (outcome.rejected || outcome.declined) {
          // The only other proof of this session was rejected by the server.
          endLocalSession()
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
        if (!operation.isCurrent()) return
        setState({ initialized: true })
        return
      }
      const outcome = await restoreFromSessionCookie()
      if (!operation.isCurrent()) return
      if (outcome.rejected || outcome.declined) {
        endLocalSession()
        return
      }
      if (outcome.error !== undefined) {
        // A cookie-only candidate is still a session candidate. A transient
        // failure (including a missing current-user route) leaves it available
        // for retry; only 401/403 may classify it as signed out.
        setState({
          initialized: true,
          status: 'unavailable',
          error: outcome.error,
        })
        return
      }
      setState({ initialized: true })
    })

  /**
   * Starts the client's ONE session restore, or returns the one already running.
   *
   * A client that nobody called `initialize()` on used to stay `'loading'` for the
   * life of the page: `createJWTAuthClient` starts at `status: 'loading'`, and only
   * `initialize()` (or a sign-in) leaves it. The template calls `initialize()` on one
   * line of `main.tsx`, so a rewrite that dropped that line made every `useAuth()`
   * read `'loading'` forever and every signed-in page never rendered — every
   * auth-gated form times out instead. The first READ
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
      if (
        user === null &&
        (state.authenticated ||
          cookieSessionCandidate ||
          pendingSessionOperations > 0 ||
          state.loading ||
          !state.initialized)
      ) {
        // Settled-looking state can still have a refresh retry in flight.
        endLocalSession()
        return
      }
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
      clearSignOutMarker()
      cookieSessionCandidate = false
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
      // shared hook, even after a successful registration.
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
      return runSessionOperation(async (operation) => {
        setState({ loading: true, error: null })

        try {
          const result = mapResult(
            await fetchAPI<unknown>(loginEndpoint, {
              method: 'POST',
              body: JSON.stringify(shapeBody('login', credentials)),
            }),
          )
          // Mapping is caller code too: check after it, immediately before any
          // state, credential, event, or timer publication.
          if (!operation.isCurrent()) {
            discardLateSession(operation, result)
            return result
          }

          // Two-factor gate: the server answered 206 `{ twoFactorRequired: true }`
          // — no tokens/user issued. Surface the result WITHOUT marking the
          // session authenticated; the caller re-prompts for the TOTP and retries.
          if (result.twoFactorRequired) {
            setState({ loading: false })
            return result
          }

          sessionRevision++
          clearSignOutMarker()
          cookieSessionCandidate = !result.accessToken
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
          const failure = await snapshotAuthFailure(err)
          if (!operation.isCurrent()) throw failure
          setState({ loading: false, error: failure.message })
          emitEvent({ type: 'error', error: failure.message })
          throw failure
        }
      })
    },

    async logout(): Promise<void> {
      await runSessionOperation(async (operation) => {
        if (!operation.isCurrent()) return
        // Capture revocation authority before local cleanup removes it. The
        // cookie remains in the request; a bearer-only API gets the old token.
        const token = tokenStorage.getAccessToken()
        const revoke = logoutEndpoint && (token || state.authenticated || cookieSessionCandidate)
        endLocalSession()
        logger.debug('User logged out')
        emitEvent({ type: 'logout' })

        if (revoke && logoutEndpoint) {
          await fetchAPI(logoutEndpoint, {
            method: 'POST',
            credentials: 'include',
            headers: token ? { Authorization: `${config.authScheme ?? 'Bearer'} ${token}` } : {},
          }).catch((error) => {
            logger.debug('Logout endpoint call failed (non-critical)', error)
          })
        }
      })
    },

    async register(data: RegisterData<TRegister>): Promise<AuthResult<T>> {
      return runSessionOperation(async (operation) => {
        setState({ loading: true, error: null })

        try {
          const result = mapResult(
            await fetchAPI<unknown>(registerEndpoint, {
              method: 'POST',
              body: JSON.stringify(shapeBody('register', data)),
            }),
          )
          if (!operation.isCurrent()) {
            discardLateSession(operation, result)
            return result
          }

          sessionRevision++
          clearSignOutMarker()
          cookieSessionCandidate = !result.accessToken
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
          const failure = await snapshotAuthFailure(err)
          if (!operation.isCurrent()) throw failure
          setState({ loading: false, error: failure.message })
          emitEvent({ type: 'error', error: failure.message })
          throw failure
        }
      })
    },

    async refresh(): Promise<AuthResult<T>> {
      return runSessionOperation(async (operation) => {
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
            if (operation.isCurrent()) emitEvent({ type: 'refresh' })
            return { user: outcome.user }
          }
          if (outcome.rejected) {
            if (operation.isCurrent()) endLocalSession()
            throw outcome.failure
          }
          if (outcome.error !== undefined) {
            if (operation.isCurrent()) {
              setState({ initialized: true, status: 'unavailable', error: outcome.error })
            }
            throw outcome.failure
          }
          if (outcome.declined && operation.isCurrent()) endLocalSession()
          throw new I18nError('auth.error.noRefreshToken', undefined, 'No refresh token available')
        }

        let raw: AuthResult<T>
        try {
          raw = await fetchAPI<AuthResult<T>>(refreshEndpoint, {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
          })
        } catch (error) {
          if (operation.isCurrent()) {
            const status = (error as { status?: number }).status
            if (status === 401 || status === 403) endLocalSession()
            else {
              setState({
                status: 'unavailable',
                error:
                  error instanceof Error ? error.message : 'The session could not be confirmed',
              })
            }
          }
          throw error
        }

        // Normalize credentials and profile together. A mapper for another answer
        // may not understand this response; preserve the standard wire result then.
        let result = raw
        if (config.mapAuthResponse) {
          try {
            const mapped = mapResult(raw)
            result = {
              ...raw,
              ...mapped,
              accessToken: mapped?.accessToken ?? raw.accessToken,
              refreshToken: mapped?.refreshToken ?? raw.refreshToken,
              user: mapped?.user ?? raw.user,
            }
          } catch (error) {
            logger.debug(
              'mapAuthResponse could not read the refresh answer; using it as given',
              error,
            )
          }
        }
        const user = result?.user ?? null
        if (!operation.isCurrent()) {
          discardLateSession(operation, result)
          return result
        }
        clearSignOutMarker()
        cookieSessionCandidate = !result.accessToken
        tokenStorage.setAccessToken(result.accessToken || null)
        if (result.refreshToken) {
          tokenStorage.setRefreshToken(result.refreshToken)
        }
        if (user) tokenStorage.setUser(user)

        setState({
          status: 'authenticated',
          authenticated: true,
          user,
          error: null,
        })

        emitEvent({ type: 'refresh' })
        scheduleRefresh()

        return result
      })
    },

    async requestPasswordReset(data: PasswordResetRequest): Promise<void> {
      await runAuthOperation(() =>
        fetchAPI(forgotPasswordEndpoint, {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      )
    },

    async confirmPasswordReset(data: PasswordResetConfirm): Promise<void> {
      await runAuthOperation(() =>
        fetchAPI(resetPasswordEndpoint, {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      )
    },

    async updateProfile(data: Partial<T>): Promise<T> {
      return runAuthOperation(async () => {
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
        const mapped = mapCurrentUser(answer, raw) ?? raw
        // The server may have accepted the old account's update, but that answer
        // must never replace a signed-out or newly signed-in account's cached
        // user. Return the request's result, applied to the profile it was sent
        // for, while leaving the current session (storage and subscribers) untouched.
        if (revision !== sessionRevision) return applyProfileAnswer(profileUser, mapped)
        // A changed-fields answer stored as the user dropped every field the save did not
        // touch from every `useAuth()` reader, the stored session and the next save's route
        // (`/users/undefined`). Apply it to the session's CURRENT user — a same-session
        // refresh that landed during the save is kept — and store and publish the result
        // once, so no reader ever sees the partial answer.
        const user = applyProfileAnswer(state.user, mapped)
        profileRevision++
        tokenStorage.setUser(user)
        setState({ user })

        return user
      })
    },

    async changePassword(oldPassword: string, newPassword: string): Promise<void> {
      // Server handler (@molecule/api-resource-user `updatePassword`)
      // reads `currentPassword`; legacy callers passed `oldPassword`,
      // so accept either name in the hook signature but translate to
      // the canonical `currentPassword` field when sending.
      await runAuthOperation(async () => {
        const revision = sessionRevision
        const user = state.user
        if (typeof changePasswordEndpoint === 'function' && !user)
          throw new I18nError(
            'auth.error.unauthorized',
            undefined,
            'Sign in before changing a password',
          )
        const endpoint =
          typeof changePasswordEndpoint === 'function'
            ? changePasswordEndpoint(user!)
            : changePasswordEndpoint
        if (
          typeof changePasswordEndpoint === 'function' &&
          (typeof endpoint !== 'string' || !endpoint.trim())
        )
          throw new TypeError('changePasswordEndpoint must resolve to a nonempty route')
        if (revision !== sessionRevision)
          throw new I18nError(
            'auth.error.unauthorized',
            undefined,
            'The password session changed before submission',
          )
        await fetchAPI(endpoint, {
          method: changePasswordMethod,
          body: JSON.stringify({ currentPassword: oldPassword, newPassword }),
        })
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
      await runSessionOperation(async (operation) => {
        const token = tokenStorage.getAccessToken()
        if (!token) {
          const outcome = await restoreFromSessionCookie()
          if (!operation.isCurrent() || outcome.stale) return
          if (outcome.rejected || outcome.declined) {
            endLocalSession()
          } else if (outcome.error !== undefined) {
            setState({ initialized: true, status: 'unavailable', error: outcome.error })
          } else if (outcome.user) {
            setState({ initialized: true })
          } else {
            setState({
              initialized: true,
              authenticated: false,
              user: null,
              status: 'unauthenticated',
            })
          }
          return
        }
        const readProfileRevision = profileRevision
        const isCurrent = (): boolean =>
          operation.isCurrent() && token === tokenStorage.getAccessToken()
        const isCurrentProfileRead = (): boolean =>
          isCurrent() && readProfileRevision === profileRevision
        try {
          // `fetchAPI` sends the stored token, so this asks the server "is this
          // session still valid?" — the background check `initialize()` does not do
          // (it restores from storage without a request by design).
          const result = await fetchAPI<{ user?: T }>(currentUserEndpoint, { method: 'GET' })
          if (!isCurrent()) return
          // The answer is the wire user, not the app's adapted profile: pass it
          // through the same `mapAuthResponse` a sign-in uses before storing it
          // so a reload keeps the adapted identity and its account controls.
          const user = mapCurrentUser(
            result,
            (result?.user ?? tokenStorage.getUser<T>()) as T | null,
          )
          if (!isCurrentProfileRead()) return
          if (user) {
            clearSignOutMarker()
            tokenStorage.setUser(user)
            setState({
              initialized: true,
              authenticated: true,
              user,
              status: 'authenticated',
              error: null,
            })
          } else {
            endLocalSession()
          }
        } catch (error) {
          if (!isCurrentProfileRead()) return
          const httpStatus = (error as { status?: number }).status
          // ONLY 401 and 403 are the server rejecting this token (revoked, expired,
          // a reset database): drop the session rather than keep sending a header
          // the server refuses. Any other status is not about the credential —
          // most importantly a 404, which means `currentUserEndpoint` does not
          // exist on this API. A route-not-found neither verifies nor rejects the
          // token, so clearing it here signed every user out of a working session
          // over a configuration mistake.
          if (httpStatus === 401 || httpStatus === 403) {
            endLocalSession()
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
      })
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

    addEventListener(listener: AuthEventListener<T>): () => void {
      // One listener signature, typed by the profile. A default
      // `AuthEventListener` is still accepted when `T` extends `UserProfile`
      // (contravariance: those events carry every `UserProfile` field, so
      // storing it as `AuthEventListener<T>` is sound). A profile that does not
      // extend `UserProfile` only accepts `AuthEventListener<T>` — no event
      // claims an `id` the user lacks.
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
