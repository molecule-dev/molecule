/**
 * Internal auth composable mirroring `@molecule/app-react`'s `useAuth`
 * semantics: one reactive auth state kept current through the client's
 * change notifications, plus thin action wrappers over the client.
 *
 * @module
 */

import {
  computed,
  type ComputedRef,
  inject,
  onMounted,
  onUnmounted,
  reactive,
  type UnwrapNestedRefs,
} from 'vue'

import type { AuthClient, AuthState } from '@molecule/app-auth'
import { AuthKey } from '@molecule/app-vue'

/**
 * Accesses the auth client from injection.
 *
 * @returns The auth client.
 * @throws {Error} When no auth client was installed.
 */
export function useAuthClient(): AuthClient<unknown> {
  const client = inject(AuthKey)
  if (!client) {
    throw new Error('useAuth must be used within an auth provider')
  }
  return client as AuthClient<unknown>
}

/** What {@link useAuth} returns. */
export interface UseAuthResult<T = Record<string, unknown>> {
  /** `'loading'` means no session decision yet; see `@molecule/app-auth`. */
  status: ComputedRef<AuthState<T>['status']>
  /** The full auth state, kept current. */
  state: UnwrapNestedRefs<AuthState<T>>
  /** Logs in with credentials. */
  login: AuthClient<T>['login']
  /** Logs out. */
  logout: () => Promise<unknown>
  /** Registers a new account. */
  register: AuthClient<T>['register']
  /** Refreshes the session. */
  refresh: () => Promise<unknown>
  /** Saves profile edits. */
  updateProfile: (data: Partial<T>) => Promise<Partial<T>>
  /** Replaces the user. */
  setUser: (user: T | null) => void
  /** Replaces the whole session. */
  setSession: AuthClient<T>['setSession']
  /** Whether a session is authenticated. */
  isAuthenticated: ComputedRef<boolean>
  /** Whether a session decision is pending. */
  isLoading: ComputedRef<boolean>
  /** The authenticated user, or null. */
  user: ComputedRef<T | null>
}

/**
 * Auth state and actions with React's `useAuth` semantics.
 *
 * @returns Auth state and actions.
 */
export function useAuth<T = Record<string, unknown>>(): UseAuthResult<T> {
  const client = useAuthClient() as AuthClient<T>

  const state = reactive<AuthState<T>>({ ...client.getState() })
  let unsubscribe: (() => void) | null = null
  onMounted(() => {
    unsubscribe = client.onAuthChange((next) => {
      Object.assign(state, next)
    })
  })
  onUnmounted(() => {
    unsubscribe?.()
  })

  return {
    status: computed(() => state.status),
    state,
    login: (credentials) => client.login(credentials),
    logout: () => client.logout(),
    register: (data) => client.register(data),
    refresh: () => client.refresh(),
    updateProfile: (data) => client.updateProfile(data),
    setUser: (user) => {
      client.setUser(user)
    },
    setSession: (session) => client.setSession(session),
    isAuthenticated: computed(() => state.authenticated),
    isLoading: computed(() => state.loading),
    user: computed(() => state.user as T | null),
  }
}
