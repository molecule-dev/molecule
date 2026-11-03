/**
 * Svelte stores for authentication.
 *
 * @module
 */

import { derived, type Readable, readable } from 'svelte/store'

import type {
  AuthClient,
  AuthResult,
  AuthState,
  LoginCredentials,
  RegisterData,
  RegisterExtraShape,
} from '@molecule/app-auth'

import { getAuthClient } from '../context.js'

/**
 * Auth stores and actions.
 */
interface AuthStores<T, TRegister extends RegisterExtraShape<TRegister> = Record<never, never>> {
  state: Readable<AuthState<T>>
  user: Readable<T | null>
  isAuthenticated: Readable<boolean>
  isLoading: Readable<boolean>
  /**
   * True once the auth status has left `'loading'` — the session is decided: signed in,
   * signed out, or unavailable. Gate a public page's first render on it
   * (`{#if $sessionReady}`) so a handler that checks `user` never runs against a session
   * restore still in flight. `'unavailable'` also becomes ready and may still have a
   * null user. Without a session hint, an anonymous visitor settles in microtasks without
   * a request.
   */
  sessionReady: Readable<boolean>
  error?: Readable<string | null>
  login: (credentials: LoginCredentials) => Promise<AuthResult<T>>
  logout: () => Promise<void>
  register: (data: RegisterData<TRegister>) => Promise<AuthResult<T>>
  refresh: () => Promise<AuthResult<T>>
}

/**
 * Create auth stores from the auth client in context.
 *
 * @returns Auth stores and actions
 *
 * @example
 * ```svelte
 * <script>
 *   import { createAuthStores } from '@molecule/app-svelte'
 *
 *   const { state, user, isAuthenticated, login, logout } = createAuthStores()
 * </script>
 *
 * {#if $isAuthenticated}
 *   <p>Welcome, {$user?.name}!</p>
 *   <button on:click={logout}>Logout</button>
 * {/if}
 * ```
 */
export function createAuthStores<
  T = unknown,
  TRegister extends RegisterExtraShape<TRegister> = Record<never, never>,
>(): AuthStores<T, TRegister> & {
  error: Readable<string | null>
} {
  const client = getAuthClient<T, TRegister>()

  // Main state store
  const state: Readable<AuthState<T>> = readable(
    client.getState(),
    (set: (value: AuthState<T>) => void) => {
      const unsubscribe = client.onAuthChange(() => {
        set(client.getState())
      })
      // Refresh after subscribing, including after a period with no subscribers.
      set(client.getState())
      return unsubscribe
    },
  )

  // Derived stores
  const user = derived(state, ($state: AuthState<T>) => $state.user)
  const isAuthenticated = derived(state, ($state: AuthState<T>) => $state.authenticated)
  const isLoading = derived(state, ($state: AuthState<T>) => $state.loading)
  const error = derived(state, ($state: AuthState<T>) => $state.error)

  // The session is decided — signed in, signed out, or unavailable. Derived from the SAME
  // state store as `user`, so the flip and the user it decided land in one update: a page
  // gated on `$sessionReady` reads the restored user when restoration succeeds.
  const sessionReady = derived(state, ($state: AuthState<T>) => $state.status !== 'loading')

  // Actions
  const login = (credentials: LoginCredentials): Promise<AuthResult<T>> => {
    return client.login(credentials)
  }

  const logout = (): Promise<void> => {
    return client.logout()
  }

  const register = (data: RegisterData<TRegister>): Promise<AuthResult<T>> => {
    return client.register(data)
  }

  const refresh = (): Promise<AuthResult<T>> => {
    return client.refresh()
  }

  return {
    state,
    user,
    isAuthenticated,
    isLoading,
    sessionReady,
    error,
    login,
    logout,
    register,
    refresh,
  }
}

/**
 * Create auth stores from a specific auth client.
 *
 * Use this when you don't want to use context.
 *
 * @param client - Auth client
 * @returns Auth stores and actions
 */
export function createAuthStoresFromClient<
  T = unknown,
  TRegister extends RegisterExtraShape<TRegister> = Record<never, never>,
>(client: AuthClient<T, TRegister>): AuthStores<T, TRegister> {
  const state: Readable<AuthState<T>> = readable(
    client.getState(),
    (set: (value: AuthState<T>) => void) => {
      const unsubscribe = client.onAuthChange(() => {
        set(client.getState())
      })
      // A readable caches its last value while stopped; auth keeps changing.
      set(client.getState())
      return unsubscribe
    },
  )

  const user = derived(state, ($state: AuthState<T>) => $state.user)
  const isAuthenticated = derived(state, ($state: AuthState<T>) => $state.authenticated)
  const isLoading = derived(state, ($state: AuthState<T>) => $state.loading)
  const sessionReady = derived(state, ($state: AuthState<T>) => $state.status !== 'loading')

  return {
    state,
    user,
    isAuthenticated,
    isLoading,
    sessionReady,
    login: (credentials: LoginCredentials) => client.login(credentials),
    logout: () => client.logout(),
    register: (data: RegisterData<TRegister>) => client.register(data),
    refresh: () => client.refresh(),
  }
}
