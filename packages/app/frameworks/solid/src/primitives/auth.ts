/**
 * Solid.js primitives for authentication.
 *
 * @module
 */

import { type Accessor, createEffect, createSignal, onCleanup } from 'solid-js'

import type {
  AuthClient,
  AuthResult,
  AuthState,
  LoginCredentials,
  RegisterData,
} from '@molecule/app-auth'

import { getAuthClient } from '../context.js'
import type { AuthPrimitives } from '../types.js'

/**
 * Create auth primitives for authentication state and actions.
 *
 * @returns Auth primitives object
 *
 * @example
 * ```tsx
 * import { createAuth } from '`@molecule/app-solid`'
 *
 * function LoginButton() {
 *   const { isAuthenticated, user, login, logout } = createAuth()
 *
 *   return (
 *     <Show
 *       when={isAuthenticated()}
 *       fallback={
 *         <button onClick={() => login({ email: '...', password: '...' })}>
 *           Login
 *         </button>
 *       }
 *     >
 *       <div>
 *         <span>Welcome, {user()?.name}</span>
 *         <button onClick={() => logout()}>Logout</button>
 *       </div>
 *     </Show>
 *   )
 * }
 * ```
 */
export function createAuth<T = unknown>(): AuthPrimitives<T> {
  const client = getAuthClient<T>()

  const [state, setState] = createSignal<AuthState<T>>(client.getState())

  // Subscribe to auth changes
  createEffect(() => {
    const unsubscribe = client.onAuthChange((newState: AuthState<T>) => {
      setState(newState)
    })

    onCleanup(unsubscribe)
  })

  // Initialize auth state
  createEffect(() => {
    client.refresh().catch(() => {
      setState((prev: AuthState<T>) => ({ ...prev, loading: false }))
    })
  })

  const user: Accessor<T | null> = () => state().user
  const isAuthenticated: Accessor<boolean> = () => state().authenticated
  const isLoading: Accessor<boolean> = () => state().loading

  return {
    state,
    user,
    isAuthenticated,
    isLoading,
    login: client.login.bind(client),
    logout: client.logout.bind(client),
    register: client.register.bind(client),
    refresh: client.refresh.bind(client),
  }
}

/**
 * Create a guard primitive that redirects unauthenticated users.
 *
 * @param redirectTo - Path to redirect to
 * @returns Accessor indicating if user is allowed
 *
 * @example
 * ```tsx
 * function ProtectedPage() {
 *   const isAllowed = createAuthGuard('/login')
 *
 *   return (
 *     <Show when={isAllowed()} fallback={<div>Redirecting...</div>}>
 *       <ProtectedContent />
 *     </Show>
 *   )
 * }
 * ```
 */
export function createAuthGuard(redirectTo: string): Accessor<boolean> {
  const { isAuthenticated, isLoading } = createAuth()

  createEffect(() => {
    if (!isLoading() && !isAuthenticated()) {
      window.location.href = redirectTo
    }
  })

  return () => isAuthenticated()
}

/**
 * Create auth helpers from context.
 *
 * @returns Auth helper functions
 */

/**
 * Creates a auth helpers.
 * @returns The created result.
 */
export function createAuthHelpers<T = unknown>(): {
  login: (credentials: LoginCredentials) => Promise<AuthResult<T>>
  logout: () => Promise<void>
  register: (data: RegisterData) => Promise<AuthResult<T>>
  refresh: () => Promise<AuthResult<T>>
  getUser: () => T | null
  getToken: () => string | null
  isAuthenticated: () => boolean
} {
  const client = getAuthClient<T>()

  return {
    login: (credentials: LoginCredentials) => client.login(credentials),
    logout: () => client.logout(),
    register: (data: RegisterData) => client.register(data),
    refresh: () => client.refresh(),
    getUser: () => client.getUser(),
    getToken: () => client.getToken?.() ?? null,
    isAuthenticated: () => client.isAuthenticated(),
  }
}

/**
 * Create auth primitives from a specific client.
 *
 * @param client - Auth client
 * @returns Auth primitives
 */
export function createAuthFromClient<T = unknown>(client: AuthClient<T>): AuthPrimitives<T> {
  const [state, setState] = createSignal<AuthState<T>>(client.getState())

  createEffect(() => {
    const unsubscribe = client.onAuthChange((newState: AuthState<T>) => {
      setState(newState)
    })

    onCleanup(unsubscribe)
  })

  createEffect(() => {
    client.refresh().catch(() => {
      setState((prev: AuthState<T>) => ({ ...prev, loading: false }))
    })
  })

  return {
    state,
    user: () => state().user,
    isAuthenticated: () => state().authenticated,
    isLoading: () => state().loading,
    login: client.login.bind(client),
    logout: client.logout.bind(client),
    register: client.register.bind(client),
    refresh: client.refresh.bind(client),
  }
}
