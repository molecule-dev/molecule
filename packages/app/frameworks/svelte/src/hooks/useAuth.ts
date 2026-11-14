/**
 * Svelte hook for authentication, porting React's `useAuth` family: the
 * session state as readable stores plus the client's actions as plain
 * functions.
 *
 * @module
 */

import { onDestroy } from 'svelte'
import { get, type Readable } from 'svelte/store'

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
import { type MaybeReadable, toReadable } from './maybe-readable.js'

/** Options for {@link useAuth}. */
export interface UseAuthOptions {
  /**
   * Whether to automatically refresh the session on mount, and again whenever
   * the flag turns on or the session decision changes while it is on.
   */
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
 * @param options - Hook options (`autoRefresh`), or a store of them: setting
 *   `autoRefresh` later probes on the same component, the way React's
 *   re-render re-runs its effect.
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
>(options?: MaybeReadable<UseAuthOptions | undefined>): UseAuthResult<T, TRegister> {
  const client = useAuthClient<T, TRegister>()
  const optionsStore = toReadable(options)
  const autoRefresh = (): boolean => get(optionsStore)?.autoRefresh ?? false

  const state = liveStore(
    () => client.getState(),
    (notify) => client.onAuthChange(notify),
  )

  // React's autoRefresh effect, re-run when `autoRefresh`, `authenticated` or
  // `loading` change (its dependency array): while autoRefresh is on and the
  // session is neither signed in nor being decided, probe once per change.
  let lastProbe: { autoRefresh: boolean; authenticated: boolean; loading: boolean } | null = null
  const maybeProbe = (): void => {
    const current = client.getState()
    const next = {
      autoRefresh: autoRefresh(),
      authenticated: current.authenticated,
      loading: current.loading,
    }
    if (
      lastProbe !== null &&
      next.autoRefresh === lastProbe.autoRefresh &&
      next.authenticated === lastProbe.authenticated &&
      next.loading === lastProbe.loading
    ) {
      return
    }
    lastProbe = next
    if (next.autoRefresh && !next.authenticated && !next.loading) {
      void client.refresh().catch((_error: unknown) => {
        // No session to refresh: the state already says unauthenticated.
      })
    }
  }
  maybeProbe()
  const stopState = state.subscribe(() => maybeProbe())
  const stopOptions = optionsStore.subscribe(() => maybeProbe())
  onDestroy(() => {
    stopState()
    stopOptions()
  })

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
