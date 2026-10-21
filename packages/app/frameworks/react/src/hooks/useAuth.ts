/**
 * React hook for authentication.
 *
 * @module
 */

import { useCallback, useContext, useEffect, useRef, useSyncExternalStore } from 'react'

import type {
  AuthClient,
  AuthSessionSeed,
  AuthState,
  LoginCredentials,
  RegisterData,
} from '@molecule/app-auth'
import { t } from '@molecule/app-i18n'

import { AuthContext } from '../contexts.js'
import type { UseAuthOptions, UseAuthResult } from '../types.js'

/**
 * Hook to access the auth client from context.
 *
 * Pass the same generics the client was created with —
 * `useAuthClient<MyUser, { username: string }>()` — so `register()` accepts
 * the app's own fields.
 *
 * @returns The auth client from context
 * @throws {Error} Error if used outside of AuthProvider
 */
export function useAuthClient<
  T = unknown,
  TRegister extends Record<string, unknown> = Record<never, never>,
>(): AuthClient<T, TRegister> {
  const client = useContext(AuthContext)
  if (!client) {
    throw new Error(
      t('react.error.useAuthOutsideProvider', undefined, {
        defaultValue: 'useAuthClient must be used within an AuthProvider',
      }),
    )
  }
  return client as AuthClient<T, TRegister>
}

/**
 * Hook for authentication state and actions.
 *
 * Pass the app's user type — the SAME type used for the auth client and its
 * config (`createJWTAuthClient<MyUser>`, `AuthClientConfig<MyUser>`) — so
 * `user` and `setSession`/`setUser` are typed for the pages:
 * `useAuth<MyUser>()`.
 *
 * For a sign-in the app runs itself (an OAuth redirect, a custom endpoint that
 * already issued the token), call `setSession({ accessToken, user })`: it
 * adopts the token and profile atomically and every consumer of this hook sees
 * `status: 'authenticated'` at once. `setUser` alone does not sign in.
 *
 * To create an account, use `const { register } = useAuth<MyUser>()` and
 * `await register({ email, password, name })`. Registration returns the auth
 * client's `AuthResult<MyUser>`; there is no separate `useRegister` hook.
 *
 * An app whose API takes its OWN registration fields passes the client's
 * second generic here too — `useAuth<MyUser, { username: string }>()` — so
 * `register({ email, password, username })` is typed exactly like the client
 * call (and `requestBody` receives the same payload). Without it, `register`
 * accepts only the base fields.
 *
 * @param options - Hook options
 * @returns Auth state and action methods
 *
 * @example
 * ```tsx
 * const { user, isAuthenticated, login, logout } = useAuth<{ id: string; name?: string }>()
 * const { register } = useAuth<MyUser, { username: string }>()
 * await register({ email, password, username }) // `username` is typed
 *
 * if (isAuthenticated) {
 *   return <div>Welcome, {user?.name}!</div>
 * }
 * ```
 */
export function useAuth<
  T = unknown,
  TRegister extends Record<string, unknown> = Record<never, never>,
>(options?: UseAuthOptions): UseAuthResult<T, TRegister> {
  const client = useAuthClient<T, TRegister>()
  const { autoRefresh = false } = options ?? {}

  // Subscribe to auth state changes with cached snapshot
  const cachedStateRef = useRef<AuthState<T> | null>(null)

  const getSnapshot = useCallback(() => {
    const next = client.getState()
    const prev = cachedStateRef.current
    if (
      prev !== null &&
      prev.status === next.status &&
      prev.initialized === next.initialized &&
      prev.authenticated === next.authenticated &&
      prev.user === next.user &&
      prev.loading === next.loading &&
      prev.error === next.error
    ) {
      return prev
    }
    cachedStateRef.current = next
    return next
  }, [client])

  const subscribe = useCallback(
    (onStateChange: () => void) => {
      return client.onAuthChange(() => onStateChange())
    },
    [client],
  )

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  // Auto-refresh on mount if requested
  useEffect(() => {
    if (autoRefresh && !state.authenticated && !state.loading) {
      client.refresh().catch(() => {
        // Silently fail - user is just not authenticated
      })
    }
  }, [autoRefresh, client, state.authenticated, state.loading])

  // Memoized action wrappers
  const login = useCallback((credentials: LoginCredentials) => client.login(credentials), [client])

  const logout = useCallback(() => client.logout(), [client])

  const register = useCallback((data: RegisterData<TRegister>) => client.register(data), [client])

  const refresh = useCallback(() => client.refresh(), [client])

  const setUser = useCallback((user: T | null) => client.setUser(user), [client])

  const setSession = useCallback(
    (session: AuthSessionSeed<T>) => client.setSession(session),
    [client],
  )

  return {
    // The single value to render from. A stored token AND user make it
    // `'authenticated'` on the FIRST render (the client restores synchronously);
    // only `'loading'` means no decision yet, so a guard waits on that alone.
    status: state.status,
    state,
    login,
    logout,
    register,
    refresh,
    setUser,
    setSession,
    isAuthenticated: state.authenticated,
    isLoading: state.loading,
    user: state.user,
  }
}

/**
 * Hook to get just the authenticated user.
 *
 * @returns The authenticated user or null
 */
export function useUser<T = unknown>(): T | null {
  const { user } = useAuth<T>()
  return user
}

/**
 * Hook to check if user is authenticated.
 *
 * @returns Whether the user is authenticated
 */
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth()
  return isAuthenticated
}
