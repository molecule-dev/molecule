/**
 * Vue composable for authentication.
 *
 * @module
 */

import { computed, type ComputedRef, inject, onMounted, onUnmounted, shallowRef } from 'vue'

import type { AuthClient, AuthState } from '@molecule/app-auth'

import { AuthKey } from '../injection-keys.js'
import type { UseAuthReturn } from '../types.js'

/**
 * Composable to access the auth client from injection.
 *
 * @returns The auth client
 * @throws {Error} Error if used without providing auth
 */
export function useAuthClient<T = unknown>(): AuthClient<T> {
  const client = inject(AuthKey)
  if (!client) {
    throw new Error('useAuthClient requires AuthProvider to be provided')
  }
  return client as AuthClient<T>
}

/**
 * Composable for authentication state and actions.
 *
 * @returns Auth state and action methods
 *
 * @example
 * ```vue
 * <script setup>
 * import { useAuth } from '`@molecule/app-vue`'
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
export function useAuth<T = unknown>(): UseAuthReturn<T> {
  const client = useAuthClient<T>()

  // Reactive state (shallowRef avoids Vue's UnwrapRef issues with generic AuthState<T>)
  const authState = shallowRef<AuthState<T>>(client.getState())

  // Subscribe to auth changes
  let unsubscribe: (() => void) | null = null

  onMounted(() => {
    unsubscribe = client.onAuthChange(() => {
      authState.value = client.getState()
    })
  })

  onUnmounted(() => {
    unsubscribe?.()
  })

  // Computed properties
  const state = computed(() => authState.value)
  const user = computed(() => authState.value.user)
  const isAuthenticated = computed(() => authState.value.authenticated)
  const isLoading = computed(() => authState.value.loading)

  // Action wrappers
  const login: AuthClient<T>['login'] = (credentials) => client.login(credentials)
  const logout: AuthClient<T>['logout'] = () => client.logout()
  const register: AuthClient<T>['register'] = (data) => client.register(data)
  const refresh: AuthClient<T>['refresh'] = () => client.refresh()

  return {
    state,
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    register,
    refresh,
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
