/**
 * Vue composable for authentication.
 *
 * @module
 */

import {
  computed,
  type ComputedRef,
  inject,
  type MaybeRefOrGetter,
  onMounted,
  onUnmounted,
  shallowRef,
  toValue,
  watch,
} from 'vue'

import type { AuthClient, AuthState, RegisterExtraShape } from '@molecule/app-auth'
import { t } from '@molecule/app-i18n'

import { AuthKey } from '../injection-keys.js'
import type { UseAuthOptions, UseAuthResult } from '../types.js'

/**
 * Composable to access the auth client from injection.
 *
 * Pass the same generics the client was created with —
 * `useAuthClient<MyUser, { username: string }>()` — so `register()` accepts
 * the app's own fields.
 *
 * @returns The auth client
 * @throws {Error} Error if used without providing auth
 */
export function useAuthClient<
  T = unknown,
  TRegister extends RegisterExtraShape<TRegister> = Record<never, never>,
>(): AuthClient<T, TRegister> {
  const client = inject(AuthKey)
  if (!client) {
    throw new Error(
      t('vue.error.useAuthOutsideProvider', undefined, {
        defaultValue: 'useAuthClient must be used within an AuthProvider',
      }),
    )
  }
  return client as AuthClient<T, TRegister>
}

/**
 * Composable for authentication state and actions.
 *
 * `status === 'loading'` is undecided: wait for it and redirect only on
 * `status === 'unauthenticated'`. `'unavailable'` keeps the session candidate
 * for retry, but `isAuthenticated` can be false and `user` can be null while a
 * token/cookie-only restore has no cached profile. A restore failure other than
 * 401/403 never signs out.
 *
 * Save profile edits with `updateProfile(patch)`; adopt a caller-issued session
 * with `setSession({ accessToken, user })` — `setUser` alone does not sign in.
 *
 * The options may be reactive (a ref or a getter): `autoRefresh` turning on
 * through them probes the session once on the same component, the way a
 * re-render turns React's effect on.
 *
 * @param options - Composable options (`autoRefresh` probes the session once
 *   on mount while signed out and not loading); may be reactive (a ref or a
 *   getter), and a change to `autoRefresh` is followed on the same component.
 * @returns Auth state and action methods
 *
 * @example
 * ```vue
 * <script setup>
 * import { useAuth } from '@molecule/app-vue'
 *
 * const { user, isAuthenticated, login, logout } = useAuth()
 *
 * async function handleLogin() {
 *   await login({ email: 'user@example.com', password: 'password' })
 * }
 * </script>
 *
 * <template>
 *   <div v-if="isAuthenticated">
 *     Welcome, {{ user?.name }}!
 *     <button @click="logout">Logout</button>
 *   </div>
 *   <div v-else>
 *     <button @click="handleLogin">Login</button>
 *   </div>
 * </template>
 * ```
 */
export function useAuth<
  T = unknown,
  TRegister extends RegisterExtraShape<TRegister> = Record<never, never>,
>(options?: MaybeRefOrGetter<UseAuthOptions | undefined>): UseAuthResult<T, TRegister> {
  const client = useAuthClient<T, TRegister>()

  // Reactive state (shallowRef avoids Vue's UnwrapRef issues with generic AuthState<T>)
  const authState = shallowRef<AuthState<T>>(client.getState())

  // Subscribe to auth changes
  let unsubscribe: (() => void) | null = null

  onMounted(() => {
    unsubscribe = client.onAuthChange(() => {
      authState.value = client.getState()
    })
    // A child (including the fallback slot) can decide auth before this parent
    // mounts. Subscribe first, then reconcile that gap without another request.
    authState.value = client.getState()
  })

  // Auto-refresh if requested: only while no session is confirmed and nothing
  // is being decided (signed out or unavailable). React runs this as an effect
  // keyed on `autoRefresh` and the session's own authenticated/loading fields:
  // it runs on mount and again whenever one of those changes, never otherwise.
  watch(
    [
      () => toValue(options)?.autoRefresh ?? false,
      () => authState.value.authenticated,
      () => authState.value.loading,
    ],
    ([autoRefresh]) => {
      if (autoRefresh && !authState.value.authenticated && !authState.value.loading) {
        client.refresh().catch((_error: unknown) => {
          // No session to refresh: the state already says unauthenticated.
        })
      }
    },
    { immediate: true },
  )

  onUnmounted(() => {
    unsubscribe?.()
  })

  // Computed properties
  const state = computed(() => authState.value)
  const status = computed(() => authState.value.status)
  const user = computed(() => authState.value.user)
  const isAuthenticated = computed(() => authState.value.authenticated)
  const isLoading = computed(() => authState.value.loading)

  // Action wrappers
  const login: AuthClient<T>['login'] = (credentials) => client.login(credentials)
  const logout: AuthClient<T>['logout'] = () => client.logout()
  const register: AuthClient<T, TRegister>['register'] = (data) => client.register(data)
  const refresh: AuthClient<T>['refresh'] = () => client.refresh()
  const updateProfile: AuthClient<T>['updateProfile'] = (data) => client.updateProfile(data)
  const setUser: AuthClient<T>['setUser'] = (value) => client.setUser(value)
  const setSession: AuthClient<T>['setSession'] = (session) => client.setSession(session)

  return {
    status,
    state,
    user,
    isAuthenticated,
    isLoading,
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
 * Composable to get just the authenticated user.
 *
 * @returns Computed user reference
 */
export function useUser<T = unknown>(): ComputedRef<T | null> {
  const { user } = useAuth<T>()
  return user
}

/**
 * Composable to check if user is authenticated.
 *
 * @returns Computed authentication status
 */
export function useIsAuthenticated(): ComputedRef<boolean> {
  const { isAuthenticated } = useAuth()
  return isAuthenticated
}
