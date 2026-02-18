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
} from '@molecule/app-auth'

import { getAuthClient } from '../context.js'

/**
 * Auth stores and actions.
 */
interface AuthStores<T> {
  state: Readable<AuthState<T>>
  user: Readable<T | null>
  isAuthenticated: Readable<boolean>
  isLoading: Readable<boolean>
  error?: Readable<string | null>
  login: (credentials: LoginCredentials) => Promise<AuthResult<T>>
  logout: () => Promise<void>
  register: (data: RegisterData) => Promise<AuthResult<T>>
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
 *   import { createAuthStores } from '`@molecule/app-svelte`'
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
export function createAuthStores<T = unknown>(): AuthStores<T> & {
  error: Readable<string | null>
} {
  const client = getAuthClient<T>()

  // Main state store
  const state: Readable<AuthState<T>> = readable(
    client.getState(),
    (set: (value: AuthState<T>) => void) => {
      return client.onAuthChange(() => {
        set(client.getState())
      })
    },
  )

  // Derived stores
  const user = derived(state, ($state: AuthState<T>) => $state.user)
  const isAuthenticated = derived(state, ($state: AuthState<T>) => $state.authenticated)
  const isLoading = derived(state, ($state: AuthState<T>) => $state.loading)
  const error = derived(state, ($state: AuthState<T>) => $state.error)

  // Actions
  const login = (credentials: LoginCredentials): Promise<AuthResult<T>> => {
    return client.login(credentials)
  }

  const logout = (): Promise<void> => {
    return client.logout()
  }

  const register = (data: RegisterData): Promise<AuthResult<T>> => {
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
export function createAuthStoresFromClient<T = unknown>(client: AuthClient<T>): AuthStores<T> {
  const state: Readable<AuthState<T>> = readable(
    client.getState(),
    (set: (value: AuthState<T>) => void) => {
      return client.onAuthChange(() => {
        set(client.getState())
      })
    },
  )

  const user = derived(state, ($state: AuthState<T>) => $state.user)
  const isAuthenticated = derived(state, ($state: AuthState<T>) => $state.authenticated)
  const isLoading = derived(state, ($state: AuthState<T>) => $state.loading)

  return {
    state,
    user,
    isAuthenticated,
    isLoading,
    login: (credentials: LoginCredentials) => client.login(credentials),
    logout: () => client.logout(),
    register: (data: RegisterData) => client.register(data),
    refresh: () => client.refresh(),
  }
}
