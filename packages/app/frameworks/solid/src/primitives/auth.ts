/**
 * Solid.js primitives for authentication.
 *
 * @module
 */

import { type Accessor, createEffect, createSignal, onCleanup, onMount, useContext } from 'solid-js'

import type {
  AuthClient,
  AuthResult,
  AuthSessionSeed,
  AuthState,
  LoginCredentials,
  RegisterData,
  RegisterExtraShape,
} from '@molecule/app-auth'
import { t } from '@molecule/app-i18n'

import { AuthContext, getAuthClient } from '../context.js'
import type { AuthPrimitives } from '../types.js'

/**
 * Hook options for {@link useAuth}.
 */
export interface UseAuthOptions {
  /** Whether to automatically refresh the token on mount. */
  autoRefresh?: boolean
}

/**
 * What {@link useAuth} returns: the session fields as accessors and the auth
 * actions as plain functions (the same names React's `useAuth` returns).
 *
 * @template T - The user profile the API returns.
 * @template TRegister - The app's own registration fields (the second generic
 *   of `createJWTAuthClient<T, TRegister>`), so `register()` is typed like the
 *   client's.
 */
export interface UseAuthResult<
  T = unknown,
  TRegister extends RegisterExtraShape<TRegister> = Record<never, never>,
> {
  /** The session status as an accessor. */
  status: Accessor<AuthState<T>['status']>
  /** The whole session state as an accessor. */
  state: Accessor<AuthState<T>>
  login: AuthClient<T>['login']
  logout: AuthClient<T>['logout']
  register: AuthClient<T, TRegister>['register']
  refresh: AuthClient<T>['refresh']
  /** Save through the configured auth transport and publish its canonical profile. */
  updateProfile: AuthClient<T>['updateProfile']
  setUser: AuthClient<T>['setUser']
  /** Adopt a session an exchange outside the client already established, in ONE update. */
  setSession: AuthClient<T>['setSession']
  /** Whether a session is authenticated locally, as an accessor. */
  isAuthenticated: Accessor<boolean>
  /** Whether the session is still undecided, as an accessor. */
  isLoading: Accessor<boolean>
  /** The cached profile as an accessor; null while none is known. */
  user: Accessor<T | null>
}

/**
 * The auth client from the nearest `MoleculeProvider` (`config.auth`), under
 * React's hook name.
 *
 * Pass the same generics the client was created with —
 * `useAuthClient<MyUser, { username: string }>()` — so `register()` accepts the
 * app's own fields.
 *
 * @returns The auth client instance.
 * @throws {Error} When no `MoleculeProvider` above configures `auth`.
 */
export function useAuthClient<
  T = unknown,
  TRegister extends RegisterExtraShape<TRegister> = Record<never, never>,
>(): AuthClient<T, TRegister> {
  const client = useContext(AuthContext)
  if (!client) {
    throw new Error(
      t('solid.error.useAuthOutsideProvider', undefined, {
        defaultValue: 'useAuthClient must be used within an AuthProvider',
      }),
    )
  }
  return client as AuthClient<T, TRegister>
}

/**
 * Authentication state and actions, under React's hook name.
 *
 * `status() === 'loading'` is undecided: wait for it and redirect only on
 * `'unauthenticated'`. `'unavailable'` keeps the session candidate for retry,
 * but `isAuthenticated()` can be false and `user()` null while a token-only
 * restore has no cached profile. A restore failure other than 401/403 never
 * signs out.
 *
 * @param options - Hook options (`autoRefresh` probes once on mount while signed out).
 * @returns Session fields as accessors and the auth actions.
 * @throws {Error} When no `MoleculeProvider` above configures `auth`.
 * @example
 * ```tsx
 * const { user, status, login, logout } = useAuth<{ id: string; name?: string }>()
 * <Show when={status() !== 'loading'} fallback={<p>Restoring session…</p>}>
 *   <button onClick={() => logout()}>Log out</button>
 * </Show>
 * ```
 */
export function useAuth<
  T = unknown,
  TRegister extends RegisterExtraShape<TRegister> = Record<never, never>,
>(options?: UseAuthOptions): UseAuthResult<T, TRegister> {
  const client = useAuthClient<T, TRegister>()
  const { autoRefresh = false } = options ?? {}

  const [state, setState] = createSignal<AuthState<T>>(client.getState())
  const unsubscribe = client.onAuthChange((next) => setState(next as AuthState<T>))
  onCleanup(unsubscribe)

  // Probe once on mount while there is no session to refresh (React runs the
  // same probe in its mount effect; the client owns failure status).
  onMount(() => {
    if (autoRefresh && !client.getState().authenticated && !client.getState().loading) {
      client.refresh().catch((_error: unknown) => {
        // No session to refresh: the state already says unauthenticated.
      })
    }
  })

  return {
    status: () => state().status,
    state,
    login: (credentials: LoginCredentials) => client.login(credentials),
    logout: () => client.logout(),
    register: (data: RegisterData<TRegister>) => client.register(data),
    refresh: () => client.refresh(),
    updateProfile: (data: Partial<T>) => client.updateProfile(data),
    setUser: (user: T | null) => client.setUser(user),
    setSession: (session: AuthSessionSeed<T>) => client.setSession(session),
    isAuthenticated: () => state().authenticated,
    isLoading: () => state().loading,
    user: () => state().user,
  }
}

/**
 * The authenticated user, under React's hook name.
 *
 * @returns Accessor for the user or null.
 * @throws {Error} When no `MoleculeProvider` above configures `auth`.
 */
export function useUser<T = unknown>(): Accessor<T | null> {
  const { user } = useAuth<T>()
  return user
}

/**
 * Whether a session exists, under React's hook name.
 *
 * @returns Accessor for whether the session is authenticated.
 * @throws {Error} When no `MoleculeProvider` above configures `auth`.
 */
export function useIsAuthenticated(): Accessor<boolean> {
  const { isAuthenticated } = useAuth()
  return isAuthenticated
}

/**
 * Create auth primitives for authentication state and actions.
 *
 * @returns Auth primitives object
 *
 * @example
 * ```tsx
 * import { createAuth } from '@molecule/app-solid'
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
export function createAuth<
  T = unknown,
  TRegister extends RegisterExtraShape<TRegister> = Record<never, never>,
>(): AuthPrimitives<T, TRegister> {
  const client = getAuthClient<T, TRegister>()

  const [state, setState] = createSignal<AuthState<T>>(client.getState())

  // Subscribe to auth changes
  createEffect(() => {
    const unsubscribe = client.onAuthChange((newState: AuthState<T>) => {
      setState(newState)
    })

    // A sibling can decide the session before this effect subscribes.
    setState(client.getState())
    onCleanup(unsubscribe)
  })

  // Initialize auth state
  createEffect(() => {
    client.initialize().catch((_error: unknown) => {
      // The client owns failure status. Read it without starting another request.
      setState(client.getState())
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
export function createAuthHelpers<
  T = unknown,
  TRegister extends RegisterExtraShape<TRegister> = Record<never, never>,
>(): {
  login: (credentials: LoginCredentials) => Promise<AuthResult<T>>
  logout: () => Promise<void>
  register: (data: RegisterData<TRegister>) => Promise<AuthResult<T>>
  refresh: () => Promise<AuthResult<T>>
  getUser: () => T | null
  getToken: () => string | null
  isAuthenticated: () => boolean
} {
  const client = getAuthClient<T, TRegister>()

  return {
    login: (credentials: LoginCredentials) => client.login(credentials),
    logout: () => client.logout(),
    register: (data: RegisterData<TRegister>) => client.register(data),
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
export function createAuthFromClient<
  T = unknown,
  TRegister extends RegisterExtraShape<TRegister> = Record<never, never>,
>(client: AuthClient<T, TRegister>): AuthPrimitives<T, TRegister> {
  const [state, setState] = createSignal<AuthState<T>>(client.getState())

  createEffect(() => {
    const unsubscribe = client.onAuthChange((newState: AuthState<T>) => {
      setState(newState)
    })

    // Reconcile changes between the first snapshot and this deferred effect.
    setState(client.getState())
    onCleanup(unsubscribe)
  })

  createEffect(() => {
    client.initialize().catch((_error: unknown) => {
      // Initialization shares the client's restore; refresh would probe again.
      setState(client.getState())
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
