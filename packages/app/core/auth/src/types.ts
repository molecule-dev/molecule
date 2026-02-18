/**
 * Type definitions for client-side authentication.
 *
 * @module
 */

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
}

/**
 * New user registration payload (email, password, optional name and metadata).
 */
export interface RegisterData {
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
 * Reactive authentication state snapshot (initialized, authenticated, user, loading, and error).
 */
export interface AuthState<T = UserProfile> {
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
 */
export type AuthEvent =
  | { type: 'login'; user: UserProfile }
  | { type: 'logout' }
  | { type: 'register'; user: UserProfile }
  | { type: 'refresh' }
  | { type: 'error'; error: string }

/**
 * Callback invoked when an authentication event occurs (login, logout, etc.).
 */
export type AuthEventListener = (event: AuthEvent) => void

/**
 * Auth client interface that all auth bond packages must implement.
 * Provides login/logout/register flows, token management, profile
 * updates, and auth state subscription.
 */
export interface AuthClient<T = UserProfile> {
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
   * Gets the current access token.
   */
  getAccessToken(): string | null

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
 */
export interface AuthClientConfig {
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
   * import { getProvider } from '`@molecule/app-storage`'
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
