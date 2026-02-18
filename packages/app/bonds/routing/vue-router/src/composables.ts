/**
 * Vue composables for Vue Router integration.
 *
 * @module
 */

import { computed, type ComputedRef, watch } from 'vue'
import { useRoute, useRouter as useVueRouter } from 'vue-router'

import { createVueRouter } from './provider.js'
import type { QueryParams, RouteDefinition, RouteLocation, RouteParams, Router } from './types.js'

/**
 * Composable to create and provide a molecule Router.
 *
 * @param routes - Optional route definitions for named routes
 * @returns The molecule Router instance
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useMoleculeRouter } from '`@molecule/app-routing-vue-router`'
 * import { provide } from 'vue'
 * import { MOLECULE_ROUTER_KEY } from '`@molecule/app-routing-vue-router`'
 *
 * const router = useMoleculeRouter()
 *
 * // Optionally provide to children
 * provide(MOLECULE_ROUTER_KEY, router)
 * </script>
 * ```
 */
export function useMoleculeRouter(routes?: RouteDefinition[]): ComputedRef<Router> {
  const vueRouter = useVueRouter()
  const route = useRoute()

  return computed(() =>
    createVueRouter({
      router: vueRouter,
      route,
      routes,
    }),
  )
}

/**
 * Composable to get the current location as a reactive ref.
 *
 * @returns Reactive location ref
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useLocation } from '`@molecule/app-routing-vue-router`'
 *
 * const location = useLocation()
 * </script>
 *
 * <template>
 *   <div>Current path: {{ location.pathname }}</div>
 * </template>
 * ```
 */
export function useLocation(): ComputedRef<RouteLocation> {
  const router = useMoleculeRouter()
  return computed(() => router.value.getLocation())
}

/**
 * Composable to get route params as a reactive ref.
 *
 * @returns Reactive params ref
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useParams } from '`@molecule/app-routing-vue-router`'
 *
 * const params = useParams()
 * </script>
 *
 * <template>
 *   <div>User ID: {{ params.id }}</div>
 * </template>
 * ```
 */
export function useParams<T extends RouteParams = RouteParams>(): ComputedRef<T> {
  const router = useMoleculeRouter()
  return computed(() => router.value.getParams<T>())
}

/**
 * Composable to get query params as a reactive ref.
 *
 * @returns Reactive query params ref
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useQuery } from '`@molecule/app-routing-vue-router`'
 *
 * const query = useQuery()
 * </script>
 *
 * <template>
 *   <div>Search: {{ query.q }}</div>
 * </template>
 * ```
 */
export function useQuery(): ComputedRef<QueryParams> {
  const router = useMoleculeRouter()
  return computed(() => router.value.getQuery())
}

/**
 * Composable to get a navigate function.
 *
 * @returns Navigate function
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useNavigate } from '`@molecule/app-routing-vue-router`'
 *
 * const navigate = useNavigate()
 *
 * function goToProfile() {
 *   navigate('/profile')
 * }
 * </script>
 * ```
 */
export function useNavigate() {
  const router = useMoleculeRouter()
  return (path: string, options?: { replace?: boolean; state?: unknown }) => {
    router.value.navigate(path, options)
  }
}

/**
 * Composable to check if a path is active.
 *
 * @param path - Path to check
 * @param exact - Whether to require exact match
 * @returns Reactive boolean ref
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useIsActive } from '`@molecule/app-routing-vue-router`'
 *
 * const isHomeActive = useIsActive('/')
 * const isUsersActive = useIsActive('/users', false)
 * </script>
 *
 * <template>
 *   <nav>
 *     <a :class="{ active: isHomeActive }" href="/">Home</a>
 *     <a :class="{ active: isUsersActive }" href="/users">Users</a>
 *   </nav>
 * </template>
 * ```
 */
export function useIsActive(path: string, exact?: boolean): ComputedRef<boolean> {
  const router = useMoleculeRouter()
  return computed(() => router.value.isActive(path, exact))
}

/**
 * Composable to subscribe to route changes.
 *
 * @param callback - Callback to run on route change
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useRouteChange } from '`@molecule/app-routing-vue-router`'
 *
 * useRouteChange((location, action) => {
 *   console.log('Route changed:', location.pathname, action)
 * })
 * </script>
 * ```
 */
export function useRouteChange(
  callback: (location: RouteLocation, action: 'push' | 'replace' | 'pop') => void,
): void {
  const router = useMoleculeRouter()

  watch(
    router,
    (currentRouter, _, onCleanup) => {
      const unsubscribe = currentRouter.subscribe(callback)
      onCleanup(unsubscribe)
    },
    { immediate: true },
  )
}

/**
 * Composable to add a navigation guard.
 *
 * @param guard - Guard function
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useNavigationGuard } from '`@molecule/app-routing-vue-router`'
 * import { useAuth } from './auth'
 *
 * const { isAuthenticated } = useAuth()
 *
 * useNavigationGuard((to, from) => {
 *   if (to.pathname.startsWith('/admin') && !isAuthenticated.value) {
 *     return '/login'
 *   }
 *   return true
 * })
 * </script>
 * ```
 */
export function useNavigationGuard(
  guard: (
    to: RouteLocation,
    from: RouteLocation | null,
  ) =>
    | boolean
    | string
    | { path: string; replace?: boolean }
    | void
    | Promise<boolean | string | { path: string; replace?: boolean } | void>,
): void {
  const router = useMoleculeRouter()

  watch(
    router,
    (currentRouter, _, onCleanup) => {
      const removeGuard = currentRouter.addGuard(guard)
      onCleanup(removeGuard)
    },
    { immediate: true },
  )
}

/**
 * Symbol for providing molecule router in Vue.
 */
export const MOLECULE_ROUTER_KEY = Symbol('molecule-router')
