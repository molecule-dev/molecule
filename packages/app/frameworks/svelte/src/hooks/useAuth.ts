/**
 * Svelte hook for authentication, porting React's `useAuth` family: the
 * session state as readable stores plus the client's actions as plain
 * functions.
 *
 * @module
 */

import { onMount } from 'svelte'
import type { Readable } from 'svelte/store'

import type {
  AuthClient,
  AuthSessionSeed,
  AuthState,
  LoginCredentials,
  RegisterData,
  RegisterExtraShape,
} from '@molecule/app-auth'

import { useAuthClient } from '../context.js'
import { fieldStore, liveStore } from './live-store.js'

/** Options for {@link useAuth}. */
export interface UseAuthOptions {
  /** Whether to automatically refresh the token on mount. */
  autoRefresh?: boolean
}

/**
 * What {@link useAuth} returns: the session's value fields as readable stores
 * (`$status`, `$user`, …) and the client's actions as plain functions.
 *
 * @template T - The user profile the API returns.
 * @template TRegister - The app's own registration fields.
 */
export interface UseAuthResult<
  T = unknown,
  TRegister extends RegisterExtraShape<TRegister> = Record<never, never>,
> {
  /**
   * The session state as one value — render from this instead of combining
   * `initialized`/`authenticated`/`loading`. Only `'loading'` means "no
   * decision yet"; redirect on `'unauthenticated'` alone.
   */
  status: Readable<AuthState<T>['status']>
  /** The whole session state. */
  state: Readable<AuthState<T>>
  /** The client's `login`. */
  login: AuthClient<T>['login']
  /** The client's `logout`. */
  logout: AuthClient<T>['logout']
  /** The client's `register` (there is no separate `useRegister`). */
  register: AuthClient<T, TRegister>['register']
  /** The client's `refresh`. */
  refresh: AuthClient<T>['refresh']
  /** Saves through the configured auth transport and publishes the saved user. */
  updateProfile: AuthClient<T>['updateProfile']
  /** Caches a user without signing in. */
  setUser: AuthClient<T>['setUser']
  /**
   * Adopts a session an exchange outside the client already established (an
   * OAuth code→token redirect, the app's own sign-in endpoint) in one update.
   */
  setSession: AuthClient<T>['setSession']
  /** Whether a session is authenticated locally. */
  isAuthenticated: Readable<boolean>
  /** Whether the client is working on a decision. */
  isLoading: Readable<boolean>
  /** The cached profile, which can be null while an unavailable candidate is retained. */
  user: Readable<T | null>
}

/**
 * Authentication state and actions, React's `useAuth` in Svelte's idiom: call
 * it during component init under `setMoleculeContext({ auth })`.
 *
 * `status === 'loading'` is undecided: wait for it and redirect only on
 * `status === 'unauthenticated'`. `'unavailable'` keeps the session candidate
 * (and may keep a cached user) for retry; a restore failure other than 401/403
 * never signs out. Save profile edits with `updateProfile(patch)`; an
 * app-owned mutation instead passes its canonical response to `setUser`. For
 * a sign-in the app itself runs, call `setSession({ accessToken, user })`.
 *
 * @param options - Hook options (`autoRefresh`).
 * @returns Auth state as stores and the actions as functions.
 * @example
 * ```svelte
 * <script>
 *   import { useAuth } from '@molecule/app-svelte'
 *   const { user, status, login, logout } = useAuth()
 * </script>
 *
 * {#if $status === 'loading'}
 *   <p>Restoring session…</p>
 * {:else if $user}
 *   <p>Welcome, {$user.name}</p>
 *   <button onclick={() => logout()}>Sign out</button>
 * {/if}
 * ```
 */
export function useAuth<
  T = unknown,
  TRegister extends RegisterExtraShape<TRegister> = Record<never, never>,
>(options?: UseAuthOptions): UseAuthResult<T, TRegister> {
  const client = useAuthClient<T, TRegister>()
  const { autoRefresh = false } = options ?? {}

  const state = liveStore(
    () => client.getState(),
    (notify) => client.onAuthChange(notify),
  )

  if (autoRefresh) {
    onMount(() => {
      const current = client.getState()
      if (!current.authenticated && !current.loading) {
        client.refresh().catch((_error: unknown) => {
          // No session to refresh: the state already says unauthenticated.
        })
      }
    })
  }

  return {
    status: fieldStore(state, 'status'),
    state,
    login: (credentials: LoginCredentials) => client.login(credentials),
    logout: () => client.logout(),
    register: (data: RegisterData<TRegister>) => client.register(data),
    refresh: () => client.refresh(),
    updateProfile: (data: Partial<T>) => client.updateProfile(data),
    setUser: (user: T | null) => client.setUser(user),
    setSession: (session: AuthSessionSeed<T>) => client.setSession(session),
    isAuthenticated: fieldStore(state, 'authenticated'),
    isLoading: fieldStore(state, 'loading'),
    user: fieldStore(state, 'user'),
  }
}

/**
 * The authenticated user, React's `useUser` in Svelte's idiom: a readable
 * store of the cached profile (or null).
 *
 * @param T - The user profile the API returns.
 * @returns A readable store of the authenticated user or null.
 */
export function useUser<T = unknown>(): Readable<T | null> {
  const { user } = useAuth<T>()
  return user
}

/**
 * Whether a session is authenticated, React's `useIsAuthenticated` in
 * Svelte's idiom.
 *
 * @returns A readable store of whether a session exists.
 */
export function useIsAuthenticated(): Readable<boolean> {
  const { isAuthenticated } = useAuth()
  return isAuthenticated
}
