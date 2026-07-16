# @molecule/app-auth

Client-side authentication interface for molecule.dev.

Provides a unified auth API that works across different auth strategies
(JWT, session, OAuth, etc.): `createJWTAuthClient` builds a fetch-based
client; `setClient`/`getClient` bond it; `login`/`logout`/`register`/
`isAuthenticated`/`getUser` delegate to the bonded client. Framework
bindings (e.g. `AuthProvider`/`useAuth` in `@molecule/app-react`) wrap the
same client.

## Quick Start

```typescript
import { createJWTAuthClient, setClient } from '@molecule/app-auth'

const client = createJWTAuthClient({ baseURL: '/api' })
setClient(client)
await client.initialize() // restore the session from the httpOnly cookie

// anywhere in the app
import { getUser, isAuthenticated, login, logout } from '@molecule/app-auth'
await login({ email, password })
if (isAuthenticated()) console.log(getUser()?.email)
```

## Type
`core`

## Installation
```bash
npm install @molecule/app-auth @molecule/app-bond @molecule/app-i18n @molecule/app-logger
```

## API

### Interfaces

#### `AuthClient`

Auth client interface that all auth bond packages must implement.
Provides login/logout/register flows, token management, profile
updates, and auth state subscription.

```typescript
interface AuthClient<T = UserProfile> {
  /**
   * Returns the current authentication state snapshot.
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
   * Updates the cached user object (state + persistent storage) without
   * hitting the network. Intended for local refreshes after a per-app
   * mutation (e.g., the user just PATCHed their own profile and the
   * server returned the canonical row). Does NOT change tokens.
   */
  setUser(user: T | null): void

  /**
   * Gets the current access token.
   */
  getAccessToken(): string | null

  /**
   * Stores the access token in the configured token storage adapter (in-memory
   * by default). Use this to seed the token after an out-of-band exchange (e.g.
   * the OAuth code→token redirect) instead of writing to `localStorage` directly,
   * which would violate the in-memory-default storage contract and make the bearer
   * token JS-readable (XSS-exfiltratable). Pass `null` to clear it.
   */
  setAccessToken(token: string | null): void

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
   * Registers a new user.
   */
  register(data: RegisterData): Promise<AuthResult<T>>

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
   */
  updateProfile(data: Partial<T>): Promise<T>

  /**
   * Changes the current user's password.
   */
  changePassword(oldPassword: string, newPassword: string): Promise<void>

  /**
   * Initializes auth state (e.g., from stored tokens).
   */
  initialize(): Promise<void>

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
   */
  addEventListener(listener: AuthEventListener): () => void

  /**
   * Destroys the auth client.
   */
  destroy(): void
}
```

#### `AuthClientConfig`

Configuration options for creating an auth client, including API
endpoints, storage strategy, token refresh, and OAuth providers.

```typescript
interface AuthClientConfig {
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
   * User profile endpoint.
   */
  profileEndpoint?: string

  /**
   * Current-user endpoint for session restore (default `/users/me`). Called by
   * `initialize()` with credentials to re-establish the session from the
   * httpOnly cookie after a full page load — the only way to stay logged in when
   * the bearer token is held in memory (the secure default; a localStorage copy
   * is XSS-exfiltratable). Must return the user (as `user` or `props`).
   */
  currentUserEndpoint?: string

  /**
   * Storage key prefix.
   */
  storagePrefix?: string

  /**
   * Token storage type or custom storage adapter.
   * - 'memory': In-memory storage (lost on page refresh)
   * - StorageAdapter: Custom storage implementation (e.g., from `@molecule/app-storage`)
   *
   * @example
   * ```typescript
   * // Use in-memory storage
   * storage: 'memory'
   *
   * // Use custom storage from `@molecule/app-storage`
   * import { getProvider } from '@molecule/app-storage'
   * const storageProvider = getProvider()
   * storage: {
   *   getItem: (key) => storageProvider.get(key),
   *   setItem: (key, value) => storageProvider.set(key, value),
   *   removeItem: (key) => storageProvider.remove(key),
   * }
   * ```
   */
  storage?: 'memory' | StorageAdapter

  /**
   * Auto refresh tokens before expiry.
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
```

#### `AuthResult`

Successful authentication result containing the user, access/refresh tokens, and expiration.

```typescript
interface AuthResult<T = UserProfile> {
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
}
```

#### `AuthState`

Reactive authentication state snapshot (initialized, authenticated, user, loading, and error).

```typescript
interface AuthState<T = UserProfile> {
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
```

#### `LoginCredentials`

Email/password login credentials with optional "remember me" flag.

```typescript
interface LoginCredentials {
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
}
```

#### `PasswordResetConfirm`

Password reset confirmation data.

```typescript
interface PasswordResetConfirm {
  /**
   * Reset token.
   */
  token: string

  /**
   * New password.
   */
  password: string
}
```

#### `PasswordResetRequest`

Password reset request data.

```typescript
interface PasswordResetRequest {
  /**
   * Email address.
   */
  email: string
}
```

#### `RegisterData`

New user registration payload (email, password, optional name and metadata).

```typescript
interface RegisterData {
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
}
```

#### `StorageAdapter`

Minimal key-value storage adapter used by the auth client for
persisting tokens and user data.

```typescript
interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}
```

#### `TokenStorage`

Internal token storage interface for reading and writing access/refresh
tokens and user profile data.

```typescript
interface TokenStorage {
  getAccessToken(): string | null
  setAccessToken(token: string | null): void
  getRefreshToken(): string | null
  setRefreshToken(token: string | null): void
  getUser<T = UserProfile>(): T | null
  setUser<T = UserProfile>(user: T | null): void
  clear(): void
}
```

#### `UserProfile`

User profile information.

```typescript
interface UserProfile {
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
```

### Types

#### `AuthEvent`

Auth event types.

```typescript
type AuthEvent =
  | { type: 'login'; user: UserProfile }
  | { type: 'logout' }
  | { type: 'register'; user: UserProfile }
  | { type: 'refresh' }
  | { type: 'error'; error: string }
```

#### `AuthEventListener`

Callback invoked when an authentication event occurs (login, logout, etc.).

```typescript
type AuthEventListener = (event: AuthEvent) => void
```

### Functions

#### `createJWTAuthClient(config)`

Creates a simple JWT-based auth client.

This is a basic implementation that can be extended or replaced
with more sophisticated auth providers.

```typescript
function createJWTAuthClient(config?: AuthClientConfig): AuthClient<T>
```

- `config` — Auth client configuration including endpoints, storage, and refresh settings.

**Returns:** A fully configured `AuthClient` instance.

#### `createTokenStorage(storage, prefix)`

Creates a token storage implementation backed by either in-memory
storage or a custom `StorageAdapter`.

```typescript
function createTokenStorage(storage?: "memory" | StorageAdapter, prefix?: string): TokenStorage
```

- `storage` — `'memory'` for in-memory storage (lost on refresh),
- `prefix` — Key prefix for storage items (default: `'molecule:auth:'`).

**Returns:** A `TokenStorage` instance.

#### `getClient()`

Retrieves the bonded auth client, throwing if none is configured.

```typescript
function getClient(): AuthClient<T>
```

**Returns:** The bonded auth client.

#### `getTokenExpiration(token)`

Returns the expiration timestamp of a JWT token in milliseconds.

```typescript
function getTokenExpiration(token: string): number | null
```

- `token` — The raw JWT string.

**Returns:** The expiration time in ms since epoch, or `null` if the token has no `exp` claim.

#### `getUser()`

Returns the current user profile, or `null` if not authenticated.

```typescript
function getUser(): T | null
```

**Returns:** The user profile, or `null` if not authenticated.

#### `hasClient()`

Checks whether an auth client is currently bonded.

```typescript
function hasClient(): boolean
```

**Returns:** `true` if an auth client is bonded.

#### `isAuthenticated()`

Checks if the current user is authenticated.

```typescript
function isAuthenticated(): boolean
```

**Returns:** `true` if the user has an active session.

#### `isTokenExpired(token, bufferSeconds)`

Checks if a JWT token is expired (or will expire within the buffer window).

```typescript
function isTokenExpired(token: string, bufferSeconds?: number): boolean
```

- `token` — The raw JWT string.
- `bufferSeconds` — Seconds before actual expiry to consider the token expired (default: 0).

**Returns:** `true` if the token is expired or lacks an `exp` claim.

#### `login(credentials)`

Logs in with the given credentials (email/username + password).

```typescript
function login(credentials: LoginCredentials): Promise<AuthResult<UserProfile>>
```

- `credentials` — Email/username and password.

**Returns:** The auth result containing tokens and user profile.

#### `logout()`

Logs out the current user, clearing tokens and session state.

```typescript
function logout(): Promise<void>
```

**Returns:** A promise that resolves when logout completes.

#### `parseJWT(token)`

Parses a JWT token payload without verification (base64-decodes
the payload segment).

```typescript
function parseJWT(token: string): T | null
```

- `token` — The raw JWT string (header.payload.signature).

**Returns:** The decoded payload object, or `null` if parsing fails.

#### `register(data)`

Registers a new user account.

```typescript
function register(data: RegisterData): Promise<AuthResult<UserProfile>>
```

- `data` — Registration data (email, password, name, etc.).

**Returns:** The auth result containing tokens and user profile.

#### `setClient(client)`

Registers an auth client as the active singleton. Called by bond
packages during application startup.

```typescript
function setClient(client: AuthClient<UserProfile>): void
```

- `client` — The auth client implementation to bond.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-logger` ^1.0.0

### Runtime Dependencies

- `@molecule/app-bond`
- `@molecule/app-i18n`
- `@molecule/app-logger`

- **A page reload "logging the user out" is the config default, not a bug.**
  Token storage defaults to `'memory'` (the secure default — a localStorage
  bearer token is XSS-exfiltratable). Staying signed in across reloads works
  by calling `client.initialize()` once at startup: it re-fetches
  `currentUserEndpoint` (default `/users/me`) with the httpOnly cookie the
  API set at login. Wire `initialize()`; do NOT "fix" reload-logout by
  copying tokens into localStorage.
- **Endpoint defaults must match your API's real routes** (`/auth/login`,
  `/auth/register`, `/auth/refresh`, `/users/logout`, `/users/me`, …).
  Align them via `createJWTAuthClient({ baseURL, ...endpoints })` — never by
  hand-editing fetch calls in components.
- Client-side auth state is UX only — the server enforces authorization on
  every request; hiding a screen is not protection.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Logging in with VALID credentials on the real login screen resolves
  `login()` and flips AuthState to `authenticated: true` with `getUser()`
  returning the actual UserProfile — the UI shows that user's own `email` /
  `name` / `avatar`, never a placeholder or a different account.
- [ ] A WRONG password shows a visible error (AuthState `error` is set and
  the promise rejects) and establishes NO session: `isAuthenticated()` stays
  false and no protected screen becomes reachable.
- [ ] Registering through the sign-up form calls `register()`, creates the
  account, and lands authenticated (`authenticated: true`, `user` populated)
  on the app's post-signup screen — not back on the login form. If the flow
  shows an email-verification / "check your inbox" step, it must be genuinely
  backed (this client's `register()` returns an authenticated session
  directly and exposes no verify method) — never a dead screen the auth
  contract cannot advance past.
- [ ] Logout calls `logout()` and clears the session (`authenticated: false`,
  `user: null`, tokens cleared); afterward every protected screen redirects
  back to login.
- [ ] Visiting a protected route while logged OUT redirects to login (the
  guard reads `isAuthenticated()`), and after authenticating you land back on
  the originally-requested screen rather than a generic home.
- [ ] The session survives a FULL page reload: after login, hard-reload →
  `initialize()` restores it from the httpOnly cookie (via
  `currentUserEndpoint`, default `/users/me`) and you stay signed in — you are
  NOT bounced to login. (The in-memory bearer token is dropped by design; the
  cookie restore is what keeps you in — do not "fix" this by writing the token
  to localStorage.)
- [ ] Password reset round-trips: `requestPasswordReset({ email })` then
  `confirmPasswordReset({ token, password })` with the emailed token, after
  which `login()` with the NEW password succeeds and the OLD password no
  longer works.
- [ ] Authorization holds: a signed-in user only ever reads/edits their OWN
  record (`getUser()` is the caller's profile, never another user's); the
  bearer token lives in memory only — it is never written to
  localStorage / sessionStorage where another script could read it; and an
  expired/invalid token fails closed — the app re-authenticates (`refresh()`
  or `logout()`), never silently serving another user's data.

## Translations

Translation strings are provided by `@molecule/app-locales-auth`.
