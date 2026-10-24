/**
 * Type definitions for client-side authentication.
 *
 * @module
 */

import type { I18nError } from '@molecule/app-i18n'

/**
 * User profile information.
 */
export interface UserProfile {
  /**
   * Unique user identifier.
   */
  id: string

  /**
   * User's email address.
   */
  email?: string

  /**
   * User's display name.
   */
  name?: string

  /**
   * User's avatar/profile image URL.
   */
  avatar?: string

  /**
   * User's roles or permissions.
   */
  roles?: string[]

  /**
   * Additional metadata.
   */
  metadata?: Record<string, unknown>
}

/**
 * The sentence every invalid profile type is rejected with.
 */
type AuthProfileRejection =
  'An auth profile must be a JSON object type of named fields, not an array, a function or a Date'

/**
 * The profile shapes the auth client accepts: a JSON object type of named
 * fields, and nothing else.
 *
 * The client does not read a field of the profile, but it does persist it:
 * `tokenStorage.setUser` writes it with `JSON.stringify` and `getUser` restores
 * it with `JSON.parse`, and `updateProfile(data: Partial<T>)` patches it
 * field-wise. An array has no named fields to read or patch, `JSON.stringify`
 * drops a function entirely, and a `Date` comes back from `JSON.parse` as a
 * string while still typed as a `Date` — so those three types are rejected on
 * every entrypoint that takes a profile type (`createJWTAuthClient`,
 * the default-auth factories, `AuthClientConfig`).
 *
 * The check is on the TOP-LEVEL shape only: a class instance, or a `Date` in a
 * nested field, is the app's own persistence contract, not this validator's.
 * A named `interface`, a type literal, an intersection and the empty object
 * type all satisfy it — `{}` compiles because it is a JSON object that
 * round-trips unchanged, not an invalid form.
 *
 * @template T - The candidate profile type.
 */
export type AuthProfileShape<T> = T extends
  readonly unknown[] | ((...args: never[]) => unknown) | Date
  ? AuthProfileRejection
  : object

/**
 * Requires a profile type to satisfy {@link AuthProfileShape}: an invalid
 * profile makes {@link AuthClientConfig} impossible to populate, so the
 * annotation itself is the error.
 *
 * @template T - The candidate profile type.
 */
export type AuthProfileGuard<T> =
  AuthProfileShape<T> extends AuthProfileRejection
    ? { readonly [K in AuthProfileRejection]: never }
    : Record<never, never>

/**
 * Email/password login credentials with optional "remember me" flag.
 */
export interface LoginCredentials {
  /**
   * Email or username.
   */
  email: string

  /**
   * Password.
   */
  password: string

  /**
   * Whether to remember the session.
   */
  remember?: boolean

  /**
   * Time-based one-time password (TOTP) from the user's authenticator app.
   * Required when the account has two-factor auth enabled — the server
   * answers `{ twoFactorRequired: true }` (HTTP 206) until a valid token
   * is supplied.
   */
  twoFactorToken?: string
}

/**
 * The shape an app's own registration fields (`TRegister`) must satisfy.
 *
 * The app's fields pass through unchanged; a field that collides with a
 * built-in one keeps the built-in type, so `{ username: string; email: number }`
 * is rejected while `{ username: string }` is accepted. Both an ordinary
 * `interface` and a type literal/alias satisfy it — unlike
 * `Record<string, unknown>`, which a TypeScript interface never satisfies,
 * because interfaces have no implicit index signature.
 *
 * @template T - The app's own registration fields, at the top level of
 *   {@link RegisterData}.
 */
export type RegisterExtraShape<T> = {
  [K in keyof T]: K extends 'email' | 'password'
    ? string
    : K extends 'name'
      ? string | undefined
      : K extends 'metadata'
        ? Record<string, unknown> | undefined
        : T[K]
} & object

/**
 * New user registration payload: the email/password fields every API takes,
 * plus `TExtra` — the app's OWN registration fields, at the top level.
 *
 * `TExtra` is what the app's sign-up form collects and its API expects
 * (`username`, `fullName`, …). Give the client the same type and the typed call
 * passes those fields straight through, so
 * {@link AuthClientConfig.requestBody} receives exactly what the form passed —
 * no cast, and no stuffing them into `name` or `metadata`:
 *
 * ```typescript
 * const client = createJWTAuthClient<UserProfile, { username: string }>({ … })
 * await client.register({ email, password, username }) // `username` is typed
 * ```
 *
 * `TExtra` defaults to no extra fields, so an app that passes `name`/`metadata`
 * (and a `requestBody` that reads them) keeps type-checking unchanged; only a
 * client constructed with a second generic accepts (and types) more fields.
 *
 * An ordinary `interface` works as well as a type literal or alias — the
 * constraint is structural, so the app can name its own fields once and pass
 * that type whole:
 *
 * ```typescript
 * interface RealWorldRegister { username: string }
 * const client = createJWTAuthClient<UserProfile, RealWorldRegister>({ … })
 * ```
 *
 * A custom field may not change a built-in field's type: `email` and
 * `password` stay `string`, `name` stays `string | undefined` and `metadata`
 * stays `Record<string, unknown> | undefined` (see {@link RegisterExtraShape}).
 *
 * @template TExtra - The app's own registration fields, at the top level.
 */
export type RegisterData<TExtra extends RegisterExtraShape<TExtra> = Record<never, never>> = {
  /**
   * Email address.
   */
  email: string

  /**
   * Password.
   */
  password: string

  /**
   * Display name.
   */
  name?: string

  /**
   * Additional registration fields.
   */
  metadata?: Record<string, unknown>
} & TExtra

/**
 * Successful authentication result containing the user, access/refresh tokens, and expiration.
 */
export interface AuthResult<T = UserProfile> {
  /**
   * Authenticated user.
   */
  user: T

  /**
   * Access token (for token-based auth).
   */
  accessToken?: string

  /**
   * Refresh token (for token-based auth).
   */
  refreshToken?: string

  /**
   * Token expiration time (Unix timestamp).
   */
  expiresAt?: number

  /**
   * Set (with HTTP 206) when the account has two-factor auth enabled and the
   * login did not include a valid `twoFactorToken`. No tokens or user are
   * issued until login is retried with the TOTP — callers must check this
   * flag BEFORE treating the result as a successful authentication.
   */
  twoFactorRequired?: boolean
}

/**
 * Password reset request data.
 */
export interface PasswordResetRequest {
  /**
   * Email address.
   */
  email: string
}

/**
 * Password reset confirmation data.
 */
export interface PasswordResetConfirm {
  /**
   * Reset token.
   */
  token: string

  /**
   * New password.
   */
  password: string
}

/**
 * The single value an app renders the session from — the four states every auth
 * UI needs, derived from {@link AuthState} so no caller has to combine
 * `initialized`/`authenticated`/`loading`/`error` itself.
 *
 * - `'loading'`: no decision yet (before `initialize()` settles). An auth
 *   operation in flight is {@link AuthState.loading} and KEEPS the decided
 *   status, so a page guarded on `'loading'` stays mounted while a Login or
 *   Register request runs.
 * - `'authenticated'`: a session exists.
 * - `'unauthenticated'`: the client settled the question and nobody is signed in.
 * - `'unavailable'`: a stored session exists but the server could not confirm it
 *   (a network or 5xx failure in {@link AuthClient.validateSession}); the session
 *   is KEPT and the app can say "reconnecting" instead of signing the user out.
 */
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'unavailable'

/**
 * Reactive authentication state snapshot (initialized, authenticated, user, loading, and error).
 */
export interface AuthState<T = UserProfile> {
  /**
   * The session's state as one value — render from this instead of combining
   * `initialized`/`authenticated`/`loading`. See {@link AuthStatus}.
   */
  status: AuthStatus

  /**
   * Whether auth state has been initialized.
   */
  initialized: boolean

  /**
   * Whether the user is authenticated.
   */
  authenticated: boolean

  /**
   * Current user (if authenticated).
   */
  user: T | null

  /**
   * Whether an auth operation is in progress.
   */
  loading: boolean

  /**
   * Last auth error (if any).
   */
  error: string | null
}

/**
 * Auth event types.
 *
 * A sign-in event carries the client's own profile type, so a listener on a
 * client typed with the app's profile reads that profile — including one that
 * does not extend {@link UserProfile}. The default is {@link UserProfile}.
 *
 * @template T - The user profile the API returns.
 */
export type AuthEvent<T = UserProfile> =
  | { type: 'login'; user: T }
  | { type: 'logout' }
  | { type: 'register'; user: T }
  | { type: 'refresh' }
  | { type: 'error'; error: string }

/**
 * Callback invoked when an authentication event occurs (login, logout, etc.).
 *
 * A listener is typed by the client's profile: `AuthEventListener<MyUser>`
 * receives `AuthEvent<MyUser>`, so a sign-in event's `user` is the app's own
 * shape. On a client whose profile extends {@link UserProfile}, a listener
 * written against the default `AuthEventListener` is still accepted (those
 * events carry every `UserProfile` field). A client whose profile does NOT
 * extend `UserProfile` — an API user with no `id` — must type its listener with
 * that profile: the default listener would read an `id` the runtime user does
 * not have.
 *
 * @template T - The user profile the API returns.
 */
export type AuthEventListener<T = UserProfile> = (event: AuthEvent<T>) => void

/**
 * The error an auth client rejects with when the API answers a non-ok HTTP
 * response. It is the {@link I18nError} the client throws — same `i18nKey`,
 * message, English fallback and rejection — plus the HTTP facts a caller needs
 * to react to the server's own answer:
 *
 * - `status`: the HTTP status code (`401`, `422`, `500`, …). Use it to tell a
 *   dead credential from a server or route problem; only 401/403 mean the
 *   session is over.
 * - `body`: the response body parsed from JSON exactly as the API sent it.
 *   The client keeps the WHOLE parsed value, not only the `errorKey` / `error`
 *   / `message` fields it maps into the message, so an app can render its own
 *   validation payload — a nested `{ errors: { credentials: ['is invalid'] } }`
 *   map, a field map with arrays, or a top-level array of messages — without
 *   re-implementing the login call. A body that is not JSON (an HTML error
 *   page, an empty body) arrives as `{}`.
 *
 * ```typescript
 * import { I18nError } from '@molecule/app-i18n'
 * import type { AuthError } from '@molecule/app-auth'
 *
 * try {
 *   await client.login({ email, password })
 * } catch (caught) {
 *   if (caught instanceof I18nError) {
 *     const { status, body } = caught as AuthError
 *     // show the API's own messages, e.g. body.errors.credentials
 *   }
 * }
 * ```
 */
export interface AuthError extends I18nError {
  /** HTTP status code of the failed response (e.g. `401`). */
  status: number

  /**
   * The response body parsed from JSON, exactly as the API sent it — nested
   * maps and arrays included. `{}` when the body is not JSON.
   */
  body: unknown
}

/**
 * A complete session an exchange outside the client has already established — an OAuth
 * code→token redirect, or the app's own sign-in endpoint. {@link AuthClient.setSession} adopts
 * it in one update: the token and the user are stored and the client becomes `authenticated`.
 *
 * @template T - The user profile the API returns.
 */
export interface AuthSessionSeed<T = UserProfile> {
  /** The access token the exchange issued. */
  accessToken: string
  /** The profile that token belongs to, as the API returned it. */
  user: T
  /** A refresh token, when the exchange issued one; omitted leaves the stored one untouched. */
  refreshToken?: string | null
}

/**
 * Auth client interface that all auth bond packages must implement.
 * Provides login/logout/register flows, token management, profile
 * updates, and auth state subscription.
 *
 * @template T - The user profile the API returns.
 * @template TRegister - The app's own registration fields, at the top level
 *   of {@link RegisterData} (default: none).
 */
export interface AuthClient<
  T = UserProfile,
  TRegister extends RegisterExtraShape<TRegister> = Record<never, never>,
> {
  /**
   * Returns the current authentication state snapshot.
   *
   * READING the state starts the client's one session restore when nobody has called
   * {@link initialize} yet — lazily and exactly once, sharing the promise an explicit
   * `initialize()` returns. A hook (`useAuth()`), a subscriber, `isAuthenticated()` and
   * `getUser()` are reads too, so a client whose entry file dropped the template's
   * `authClient.initialize()` line still restores instead of reporting `'loading'`
   * forever.
   */
  getState(): AuthState<T>

  /**
   * Returns whether the user is currently authenticated.
   */
  isAuthenticated(): boolean

  /**
   * Gets the current user.
   */
  getUser(): T | null

  /**
   * Optional ownership marker for the current session. Compare values only within
   * this client: replacing or ending a session changes it, including re-adopting
   * the same token and user. Profile updates and same-session refreshes keep it.
   * Consumers can use it to discard stale async work without treating editable
   * user fields as an immutable account identifier. Providers without this
   * capability require the consumer's own stable identity check.
   */
  getSessionRevision?(): number

  /**
   * Updates the cached user object (state + persistent storage) without
   * hitting the network. Intended for local refreshes after a per-app
   * mutation (e.g., the user just PATCHed their own profile and the
   * server returned the canonical row). Does NOT change tokens.
   *
   * This does not sign the client in: `authenticated` and `status` are
   * unchanged, so an anonymous client stays anonymous. Use
   * {@link login} / {@link register} for a credential exchange, or
   * {@link setSession} when the token was issued outside the client.
   */
  setUser(user: T | null): void

  /**
   * Gets the current access token.
   */
  getAccessToken(): string | null

  /**
   * Stores the access token in the configured token storage adapter (in a
   * browser, Web Storage; `'memory'` where no browser store exists). Use this
   * to seed the token after an out-of-band exchange (e.g. the OAuth
   * code→token redirect) instead of writing to `localStorage` directly,
   * which would violate the storage contract and make a stored bearer token
   * JS-readable (XSS-exfiltratable). Pass `null` to clear it.
   *
   * This changes token storage only; it does not sign the client in
   * (`authenticated` and `status` are unchanged). Use {@link login} /
   * {@link register} for a credential exchange, or call {@link setSession}
   * with the token and the user to establish an already-issued session.
   */
  setAccessToken(token: string | null): void

  /**
   * Adopts a session an out-of-band exchange already established: stores the
   * access token (and the refresh token when given), caches the user, and
   * sets the COMPLETE state — `initialized`, `authenticated`, `status:
   * 'authenticated'`, no error — in one update, with one subscriber
   * notification. Every hook reading the shared client sees the user as
   * signed in immediately.
   *
   * This is the way to seed an OAuth/custom sign-in. Calling
   * {@link setAccessToken} and {@link setUser} instead does NOT sign the
   * client in.
   */
  setSession(session: AuthSessionSeed<T>): void

  /**
   * Gets the refresh token.
   */
  getRefreshToken(): string | null

  /**
   * Logs in with credentials.
   */
  login(credentials: LoginCredentials): Promise<AuthResult<T>>

  /**
   * Logs out the current user.
   */
  logout(): Promise<void>

  /**
   * Registers a new user. Accepts the base fields plus the app's own fields
   * (`TRegister`) at the top level — see {@link RegisterData}.
   */
  register(data: RegisterData<TRegister>): Promise<AuthResult<T>>

  /**
   * Refreshes the access token.
   */
  refresh(): Promise<AuthResult<T>>

  /**
   * Requests a password reset.
   */
  requestPasswordReset(data: PasswordResetRequest): Promise<void>

  /**
   * Confirms a password reset.
   */
  confirmPasswordReset(data: PasswordResetConfirm): Promise<void>

  /**
   * Updates the current user's profile.
   * Returns the saved response. If the session is explicitly replaced or ended
   * while the request is pending, that response does not replace the current
   * session's user or persisted cache.
   */
  updateProfile(data: Partial<T>): Promise<T>

  /**
   * Changes the current user's password.
   */
  changePassword(oldPassword: string, newPassword: string): Promise<void>

  /**
   * Initializes auth state (e.g., from stored tokens).
   *
   * LAZY and IDEMPOTENT: the first read of the state ({@link getState},
   * {@link subscribe}, `useAuth()`) starts this same restore when nobody has called
   * `initialize()`, and every later call shares the one promise instead of sending a
   * second request. An app that keeps the template's explicit call behaves exactly as
   * before; an app that loses that line still restores its session.
   *
   * With a stored token AND a stored user it marks the session `'authenticated'`
   * SYNCHRONOUSLY — before its first `await` — so the first render is the
   * signed-in UI and no page waits on a verification round trip. Any check
   * (a refresh, the cookie-restore probe) settles behind that render, and only an
   * explicit 401/403 ends the session; a network/5xx/404 failure keeps it and
   * reports `'unavailable'`. With no stored user the client stays `'loading'`
   * until the cookie restore decides.
   *
   * Do not put this call (or a `/me` request of your own) in front of the first
   * render, and do not render a loading screen over a session it just restored:
   * `whenRestored()` already resolves as soon as the restore has settled, and the
   * HTTP gate built on it holds requests for exactly that window.
   */
  initialize(): Promise<void>

  /**
   * Re-checks a restored session against the server, in the background — the
   * boot-time validation an app with a stored token needs when a revoked or
   * expired token must sign the user out. Call it AFTER the first render
   * (`initialize()` restores synchronously from storage; this costs one request).
   *
   * - The server confirms the user: the session is refreshed and {@link AuthState.status}
   *   stays `'authenticated'`.
   * - The server answers 401 or 403: the token is dead — the stored session is
   *   cleared and the status becomes `'unauthenticated'`.
   * - The server cannot confirm the session — a network failure, a 5xx, or a 404
   *   from a misconfigured {@link AuthClientConfig.currentUserEndpoint}: the
   *   session (token AND user) is KEPT and the status becomes `'unavailable'`, so
   *   the app can retry instead of signing the user out over a bad connection or a
   *   route that does not exist. The 404 error names `currentUserEndpoint`.
   *
   * Do not hand-write this beside the client: a parallel token/user store for a
   * "validating"/"unavailable" flag is the race this method removes.
   *
   * Optional: a provider with no restorable session has nothing to validate.
   */
  validateSession?(): Promise<void>

  /**
   * Resolves when the session restore started by `initialize()` has settled — the point
   * after which the client knows whether this visitor is signed in.
   *
   * Resolves IMMEDIATELY when no restore is in flight: before `initialize()` is ever
   * called, and after it has finished. A restore that failed resolves too (it settled the
   * question), so an HTTP client can await this before every request without risking one
   * held forever. That is what makes the fetch-before-restore race impossible: a page that
   * fetches viewer-dependent data on mount waits here instead of going out anonymously
   * (see `setAuthGate` in `@molecule/app-http`).
   *
   * Optional: a provider that restores no session has nothing to wait for. Without it, an
   * HTTP client bonded to that provider sends first-paint requests unauthenticated.
   *
   * A provider whose restore sends a request THROUGH the gated HTTP client must send that
   * request with `skipAuthGate: true` (`RequestConfig` in `@molecule/app-http`): the gate
   * waits on this promise, so holding the restore's own request makes the gate wait on
   * itself and stalls every request it holds until it times out. `createJWTAuthClient`'s
   * restore does not need it — it uses `fetch`, not the bonded client.
   */
  whenRestored?(): Promise<void>

  /**
   * Subscribes to auth state changes.
   */
  subscribe(callback: (state: AuthState<T>) => void): () => void

  /**
   * Subscribes to auth state changes (alias for subscribe).
   */
  onAuthChange(callback: (state: AuthState<T>) => void): () => void

  /**
   * Gets the current access token (alias for getAccessToken).
   */
  getToken?(): string | null

  /**
   * Adds an auth event listener.
   *
   * The listener is typed by this client's profile. A client whose profile
   * extends {@link UserProfile} also accepts a default
   * {@link AuthEventListener} — those events carry every `UserProfile` field, so
   * a listener written before listeners became profile-typed keeps compiling.
   * A profile that does not extend `UserProfile` (no `id`) requires
   * `AuthEventListener<T>`: no event is typed with an `id` the runtime user
   * does not have.
   */
  addEventListener(
    listener: [T] extends [UserProfile]
      ? AuthEventListener<T> | AuthEventListener<UserProfile>
      : AuthEventListener<T>,
  ): () => void

  /**
   * Destroys the auth client.
   */
  destroy(): void
}

/**
 * Minimal key-value storage adapter used by the auth client for
 * persisting tokens and user data.
 */
export interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/**
 * Configuration options for creating an auth client, including API
 * endpoints, storage strategy, token refresh, and OAuth providers.
 *
 * Type it with the app's user — `AuthClientConfig<MyUser>` — the same type
 * `createJWTAuthClient<MyUser>` returns and `useAuth<MyUser>()` reads. That
 * makes {@link AuthClientConfigOptions.mapAuthResponse} return
 * `AuthResult<MyUser>`, so a mapper that omits a required custom field is a type
 * error instead of a signed-in page reading `undefined`
 * (xr-molecule-flash-m255). Keep every wire field the pages read (spread the
 * wire user and add `id`/`name`/`avatar`); mapping a field to a different name
 * does not preserve the original, and a `as unknown as MyUser` assertion hides
 * the loss. See the module docs for the wire-preserving adapter.
 *
 * `T` is the app's OWN profile shape and need not extend {@link UserProfile}:
 * the client stores and returns the object it is given and reads no field of
 * it, so an API whose user has no `id` — `{ username, email, bio, image }` —
 * is typed by its own `interface` directly, with no fabricated `id`. The
 * default, {@link UserProfile}, still requires `id: string`. A primitive,
 * `null`, an array, a function or a `Date` is rejected — see
 * {@link AuthProfileShape} for the persistence contract behind that list.
 *
 * The type argument is NOT inferred from `mapAuthResponse`: an untyped
 * `createJWTAuthClient({ mapAuthResponse })` stays typed `UserProfile`, so the
 * default configuration keeps requiring `id: string`. Name the profile at the
 * factory (`createJWTAuthClient<MyUser>(config)`) — which also checks this
 * config against `MyUser`.
 *
 * @template T - The user profile the API returns: a JSON object type of named
 *   fields. The default, {@link UserProfile}, keeps the untyped configuration
 *   working.
 */
export type AuthClientConfig<T extends object = UserProfile> = AuthClientConfigOptions<T> &
  AuthProfileGuard<T>

/**
 * Every option {@link AuthClientConfig} accepts, typed by the profile.
 *
 * Use `AuthClientConfig<T>` rather than this type: it adds the profile-shape
 * check. This interface exists so each member's documentation is addressable.
 *
 * @template T - The user profile the API returns.
 */
export interface AuthClientConfigOptions<T extends object = UserProfile> {
  /**
   * API base URL.
   */
  baseURL?: string

  /**
   * Login endpoint.
   */
  loginEndpoint?: string

  /**
   * Logout endpoint.
   */
  logoutEndpoint?: string

  /**
   * Register endpoint.
   */
  registerEndpoint?: string

  /**
   * Refresh endpoint.
   */
  refreshEndpoint?: string

  /**
   * The write route used by `updateProfile`, independently of `currentUserEndpoint`.
   * Defaults to `/auth/profile`. A resource route with an account id can resolve
   * from the signed-in user, e.g. `(user) => '/accounts/' + encodeURIComponent(user.id)`.
   * A profile with no `id` resolves from a field it does have, e.g.
   * `(user) => '/people/' + encodeURIComponent(user.username)`.
   * The resolver sees the current user before the patch, never caller-submitted identity.
   */
  profileEndpoint?: string | ((user: Readonly<T>) => string)

  /** HTTP method for `updateProfile()` (default `'PATCH'`; `'PUT'` for a `PUT /api/user` route). */
  profileUpdateMethod?: 'PATCH' | 'PUT' | 'POST'

  /** Request-body adapter for `updateProfile()` — default the `Partial<T>` as given, e.g. `(data) => ({ user: data })`; see the module docs. */
  profileRequestBody?: (data: Partial<T>) => unknown

  /**
   * The API route that returns the signed-in user (default `/users/me`). Called
   * with credentials by `initialize()` to re-establish the session after a full
   * page load when the token did not survive the reload itself — i.e. when
   * `storage` is `'memory'` and the API sets an httpOnly session cookie — and by
   * {@link AuthClient.validateSession} on every reload to confirm a stored token
   * is still valid. Must return the user (as `user` or `props`).
   *
   * Set it whenever the app serves its own current-user route: a wrong value
   * answers 404, which `validateSession` reports as `'unavailable'` and keeps the
   * stored token instead of signing the user out — but the session then stays
   * unconfirmed.
   */
  currentUserEndpoint?: string

  /**
   * Storage key prefix.
   */
  storagePrefix?: string

  /**
   * The EXACT `StorageAdapter` key the access token is written under (default
   * `${storagePrefix}accessToken`).
   *
   * Set it when something outside this package reads the token at its own key —
   * an e2e suite's contract (RealWorld's specs read `localStorage.jwtToken`), a
   * second library, a host page — instead of mirroring the token into
   * `localStorage` beside the client. The refresh token and the cached user keep
   * the prefix.
   *
   * In a browser the client's storage default is {@link createBrowserStorageAdapter},
   * so `tokenKey` alone writes the token to exactly that key and a reload keeps
   * the session. An EXPLICIT `storage: 'memory'` beside it warns at construction:
   * the value then lives in a process-local Map nothing outside this client can
   * read, and a reload signs the user out.
   */
  tokenKey?: string

  /**
   * Scheme of the `Authorization` header the access token is sent with:
   * `Bearer` (default), or e.g. `Token` for an API that reads
   * `Authorization: Token <jwt>`.
   */
  authScheme?: string

  /**
   * Shape the login/register request body for an API that expects another
   * envelope (default: the payload as given). `register()` hands this callback
   * exactly what the caller passed — including the app's own fields, typed
   * through `createJWTAuthClient<UserProfile, { username: string }>` — so the
   * body can be sent as-is under the envelope the API wants.
   *
   * RealWorld, for example, nests the payload under `user` and registers with
   * `{ user: { username, email, password } }`:
   *
   * ```typescript
   * const client = createJWTAuthClient<UserProfile, { username: string }>({
   *   requestBody: (kind, payload) => ({ user: payload }),
   *   // …
   * })
   * await client.register({ username, email, password })
   * ```
   *
   * A caller that keeps the untyped payload can map the base fields instead:
   * `(kind, p) => ({ user: { username: p.name, email: p.email, password: p.password } })`
   * with `register({ email, password, name: username })`.
   *
   * @param kind - Which request.
   * @param payload - The credentials or registration data.
   * @returns The JSON body to send.
   */
  requestBody?: (kind: 'login' | 'register', payload: Record<string, unknown>) => unknown

  /**
   * Turn an answer that carries a user into the client's
   * `{ accessToken, refreshToken?, user }` (default: the answer as given).
   * RealWorld, for example: `(data) => ({ accessToken: data.user.token, user: data.user })`.
   *
   * It is the ONE user-shape adapter, and the client applies it on EVERY path
   * that adopts a user from an API answer — `login()`, `register()`,
   * `validateSession()`, the cookie restore `initialize()`/`refresh()` run, the
   * token-refresh answer, and `updateProfile()`. Those answers carry the raw wire
   * user (a current-user route typically answers a bare `{ user }`), so applying
   * the same mapping is what keeps the adapted profile after a reload instead of
   * replacing it with the unadapted one (xr-molecule-flash-m184). A mapper that
   * cannot read a given answer (it throws, or returns no `user`) leaves that
   * answer's user as it came.
   *
   * It is NOT applied to `setSession()` or `setUser()`: those receive a profile
   * the caller already built in this client's shape, not a wire answer.
   *
   * The return type does NOT infer the profile: an untyped
   * `createJWTAuthClient({ mapAuthResponse })` stays `UserProfile`, so a mapper
   * that returns a no-id profile fails to compile there instead of silently
   * replacing the default with whatever the mapper happened to return. Name the
   * profile on the factory (`createJWTAuthClient<MyUser>({ mapAuthResponse })`)
   * to use a custom one.
   *
   * @param data - The parsed response body.
   * @returns The auth result.
   */
  mapAuthResponse?: (data: unknown) => AuthResult<NoInfer<T>>

  /**
   * Where the access/refresh token and the cached user are kept — the field that
   * decides whether a page reload keeps the user signed in.
   *
   * **In a browser the default is `createBrowserStorageAdapter()` (Web Storage)**,
   * so a reload keeps the session with no wiring of its own; outside a browser
   * (SSR, a Node test) the default is `'memory'`. Pass `'memory'` EXPLICITLY when
   * the API sets an httpOnly session cookie and you do not want a script-readable
   * copy: `'memory'` is a process-local store, and `initialize()` then restores
   * through {@link AuthClientConfig.currentUserEndpoint} — the strongest
   * configuration, because no script can read the cookie.
   *
   * **An app whose external contract requires the token at a specific key** — a
   * supplied e2e suite (the RealWorld specs read `localStorage.jwtToken` in
   * `SELECTORS.md`), a host page, a second library — sets `tokenKey: 'jwtToken'`;
   * in a browser that is enough, because the default store is Web Storage. The
   * session (token AND user) is then restored synchronously in `initialize()` —
   * with no store of your own. `tokenKey` places the access token at that exact
   * key; the refresh token and the cached user keep `storagePrefix`.
   *
   * A bearer token in Web Storage is readable by any script on the origin, so an
   * XSS can steal it; see {@link createBrowserStorageAdapter}'s `@remarks` for the
   * trade and for the cookie alternative. Never answer a suite's storage key with a
   * second store or a restore script beside this client — that races the client's
   * own restore, and either side's 401 signs the user out for good.
   *
   * Any adapter with `getItem`/`setItem`/`removeItem` works — the methods are
   * SYNCHRONOUS, so the async `@molecule/app-storage` provider
   * (`getProvider()`, whose `get()` returns a Promise) is NOT one: wrap the
   * `Storage` object it was built on (`createBrowserStorageAdapter({ storage })`),
   * or store a different way.
   *
   * @example
   * ```typescript
   * import { createBrowserStorageAdapter } from '@molecule/app-auth'
   *
   * // A suite/host page reads the token at its own key (the browser default
   * // already stores it; `storage` is shown for an explicit choice):
   * storage: createBrowserStorageAdapter()
   * tokenKey: 'jwtToken'
   * // Only this tab's lifetime, at a narrower exposure than localStorage:
   * storage: createBrowserStorageAdapter({ kind: 'session' })
   * // An httpOnly cookie session — keep the bearer out of script-reachable storage:
   * storage: 'memory'
   * ```
   */
  storage?: 'memory' | StorageAdapter

  /**
   * Decide whether a user returned by the cookie-restore probe
   * (`currentUserEndpoint`) constitutes a signed-in CLIENT session. Return
   * `false` to reject the restore: the client stays unauthenticated and the
   * `mol_auth` presence hint is cleared so later loads skip the probe (the
   * httpOnly session cookie is untouched and keeps authenticating API calls).
   * Use this when the server also issues sessions that must never appear
   * signed-in client-side — e.g. an anonymous/guest session whose user row
   * (`isAnonymous`) would otherwise hydrate as a logged-in user. Defaults to
   * accepting every restored user.
   * @param user - The user returned by the restore probe, in the profile shape
   *   `T` names (already passed through {@link mapAuthResponse}).
   * @returns Whether to establish the client session from this user.
   */
  shouldRestoreUser?: (user: T) => boolean

  /**
   * Refresh the access token before it expires. A no-op unless the API issued a
   * refresh token at login/register — with none stored, nothing is scheduled and
   * the session is never ended by the refresh timer; an API that rejects the
   * access token (401) or an explicit logout ends it instead. Defaults to `true`.
   */
  autoRefresh?: boolean

  /**
   * Refresh tokens this many seconds before expiry.
   */
  refreshBuffer?: number

  /**
   * Forgot password / password reset request endpoint.
   */
  forgotPasswordEndpoint?: string

  /**
   * Password reset confirmation endpoint.
   */
  resetPasswordEndpoint?: string

  /**
   * Change password endpoint.
   */
  changePasswordEndpoint?: string

  /**
   * Available OAuth providers (e.g., ['github', 'google', 'gitlab']).
   */
  oauthProviders?: string[]

  /**
   * OAuth endpoint path (default: '/oauth').
   */
  oauthEndpoint?: string
}

/**
 * Internal token storage interface for reading and writing access/refresh
 * tokens and user profile data.
 */
export interface TokenStorage {
  getAccessToken(): string | null
  setAccessToken(token: string | null): void
  getRefreshToken(): string | null
  setRefreshToken(token: string | null): void
  getUser<T = UserProfile>(): T | null
  setUser<T = UserProfile>(user: T | null): void
  clear(): void
}
