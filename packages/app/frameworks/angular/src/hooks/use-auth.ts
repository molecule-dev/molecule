/**
 * Angular functions for authentication, mirroring `useAuth`,
 * `useAuthClient`, `useUser` and `useIsAuthenticated` from
 * `@molecule/app-react`.
 *
 * @module
 */

import { computed, DestroyRef, effect, inject, type Signal, signal, untracked } from '@angular/core'

import type {
  AuthClient,
  AuthResult,
  AuthSessionSeed,
  AuthState,
  LoginCredentials,
  RegisterData,
  RegisterExtraShape,
} from '@molecule/app-auth'

import { injectProvider } from '../inject.js'
import { type MaybeSignal, readMaybeSignal } from '../maybe-signal.js'
import { AUTH_CLIENT } from '../tokens.js'

/**
 * The auth client registered by `provideMolecule({ auth })` or `provideAuth`.
 * Call it in an injection context.
 *
 * @returns The auth client.
 * @throws {Error} When no auth client is registered.
 */
export function useAuthClient<
  T = unknown,
  TRegister extends RegisterExtraShape<TRegister> = Record<never, never>,
>(): AuthClient<T, TRegister> {
  return injectProvider(AUTH_CLIENT, 'useAuthOutsideProvider') as AuthClient<T, TRegister>
}

/** Options for {@link useAuth}. */
export interface UseAuthOptions {
  /**
   * Refresh the session once on mount when the visitor is signed out and the
   * state is decided (a silent probe for a token the storage may hold).
   * Default `false`.
   */
  autoRefresh?: boolean
}

/**
 * What {@link useAuth} returns: every state field as a signal and every auth
 * action as a plain function.
 */
export interface UseAuthResult<
  T = unknown,
  TRegister extends RegisterExtraShape<TRegister> = Record<never, never>,
> {
  /** `'loading'` until the client decides the session, then its status. */
  readonly status: Signal<AuthState<T>['status']>
  /** The full auth state. */
  readonly state: Signal<AuthState<T>>
  /** The signed-in user, or `null`. */
  readonly user: Signal<T | null>
  /** Whether a session exists. */
  readonly isAuthenticated: Signal<boolean>
  /** Whether the session is still being decided. */
  readonly isLoading: Signal<boolean>
  /** Signs in with credentials. */
  login: (credentials: LoginCredentials) => Promise<AuthResult<T>>
  /** Signs out. */
  logout: () => Promise<void>
  /** Creates an account (also signs it in). */
  register: (data: RegisterData<TRegister>) => Promise<AuthResult<T>>
  /** Refreshes the session from its token. */
  refresh: () => Promise<AuthResult<T>>
  /** Saves profile edits through the client and publishes the saved user. */
  updateProfile: (data: Partial<T>) => Promise<T>
  /** Caches a user without signing in. */
  setUser: (user: T | null) => void
  /** Adopts a caller-issued session atomically. */
  setSession: (session: AuthSessionSeed<T>) => void
}

/**
 * Authentication state and actions. Call it in an injection context (a
 * component field initializer or constructor).
 *
 * `status === 'loading'` is undecided: wait for it and redirect only on
 * `status === 'unauthenticated'`. `'unavailable'` keeps the session candidate
 * for retry, but `isAuthenticated` can be false and `user` can be null while a
 * token/cookie-only restore has no cached profile. A restore failure other than
 * 401/403 never signs out.
 *
 * The options may be a signal: `autoRefresh` turning on through it probes once
 * (when the visitor is signed out and decided), the way React re-renders
 * `useAuth` with the new option.
 *
 * @param options - Hook options (`autoRefresh`), or a signal of them.
 * @returns Auth state as signals and the auth actions.
 */
export function useAuth<
  T = unknown,
  TRegister extends RegisterExtraShape<TRegister> = Record<never, never>,
>(options?: MaybeSignal<UseAuthOptions>): UseAuthResult<T, TRegister> {
  const client = useAuthClient<T, TRegister>()

  const state = signal<AuthState<T>>(client.getState())
  const stop = client.onAuthChange(() => state.set(client.getState()))
  inject(DestroyRef).onDestroy(stop)

  // React's autoRefresh effect re-runs on exactly these changes: the option,
  // `state.authenticated` and `state.loading`. The two computeds extract those
  // primitives (a computed only re-notifies when its own value changes), so the
  // effect below re-runs on the same set.
  const authenticated = computed(() => state().authenticated)
  const deciding = computed(() => state().loading)
  effect(() => {
    const { autoRefresh = false } = readMaybeSignal(options) ?? {}
    const isSignedOut = !authenticated()
    const isDecided = !deciding()
    if (!autoRefresh || !isSignedOut || !isDecided) return
    untracked(() => {
      client.refresh().catch((_error: unknown) => {
        // No session to refresh: the state already says unauthenticated.
      })
    })
  })

  const login = (credentials: LoginCredentials): Promise<AuthResult<T>> => client.login(credentials)
  const logout = (): Promise<void> => client.logout()
  const register = (data: RegisterData<TRegister>): Promise<AuthResult<T>> => client.register(data)
  const refresh = (): Promise<AuthResult<T>> => client.refresh()
  const updateProfile = (data: Partial<T>): Promise<T> => client.updateProfile(data)
  const setUser = (user: T | null): void => {
    client.setUser(user)
  }
  const setSession = (session: AuthSessionSeed<T>): void => {
    client.setSession(session)
  }

  return {
    status: computed(() => state().status),
    state: state.asReadonly(),
    user: computed(() => state().user),
    isAuthenticated: computed(() => state().authenticated),
    isLoading: computed(() => state().loading),
    login,
    logout,
    register,
    refresh,
    updateProfile,
    setUser,
    setSession,
  }
}

/**
 * The signed-in user alone. Call it in an injection context.
 *
 * @returns A signal of the authenticated user or `null`.
 */
export function useUser<T = unknown>(): Signal<T | null> {
  return useAuth<T>().user
}

/**
 * Whether a session exists. Call it in an injection context.
 *
 * @returns A signal of the authentication flag.
 */
export function useIsAuthenticated(): Signal<boolean> {
  return useAuth().isAuthenticated
}
