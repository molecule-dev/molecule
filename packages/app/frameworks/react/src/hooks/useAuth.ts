/**
 * React hook for authentication.
 *
 * @module
 */

import { useCallback, useContext, useEffect, useRef, useSyncExternalStore } from 'react'

import type { AuthClient, AuthState, LoginCredentials, RegisterData } from '@molecule/app-auth'
import { t } from '@molecule/app-i18n'

import { AuthContext } from '../contexts.js'
import type { UseAuthOptions, UseAuthResult } from '../types.js'

/**
 * Hook to access the auth client from context.
 *
 * @returns The auth client from context
 * @throws {Error} Error if used outside of AuthProvider
 */
export function useAuthClient<T = unknown>(): AuthClient<T> {
  const client = useContext(AuthContext)
  if (!client) {
    throw new Error(
      t('react.error.useAuthOutsideProvider', undefined, {
        defaultValue: 'useAuthClient must be used within an AuthProvider',
      }),
    )
  }
  return client as AuthClient<T>
}

/**
 * Hook for authentication state and actions.
 *
 * @param options - Hook options
 * @returns Auth state and action methods
 *
 * @example
 * ```tsx
 * const { user, isAuthenticated, login, logout } = useAuth()
 *
 * if (isAuthenticated) {
 *   return <div>Welcome, {user.name}!</div>
 * }
 * ```
 */
export function useAuth<T = unknown>(options?: UseAuthOptions): UseAuthResult<T> {
  const client = useAuthClient<T>()
  const { autoRefresh = false } = options ?? {}

  // Subscribe to auth state changes with cached snapshot
  const cachedStateRef = useRef<AuthState<T> | null>(null)

  const getSnapshot = useCallback(() => {
    const next = client.getState()
    const prev = cachedStateRef.current
    if (
      prev !== null &&
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

  const register = useCallback((data: RegisterData) => client.register(data), [client])

  const refresh = useCallback(() => client.refresh(), [client])

  return {
    state,
    login,
    logout,
    register,
    refresh,
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
