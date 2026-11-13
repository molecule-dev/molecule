/**
 * Vue composables for Vue Router integration.
 *
 * @module
 */

import { computed, type ComputedRef, watch } from 'vue'
import { type Router as VueRouterInstance, useRouter as useVueRouter } from 'vue-router'

import { setRouter } from '@molecule/app-routing'

import { createVueRouter } from './provider.js'
import type { QueryParams, RouteDefinition, RouteLocation, RouteParams, Router } from './types.js'

/**
 * One molecule `Router` per Vue Router instance. The router reads Vue Router's live
 * `currentRoute`, so it never needs rebuilding when the route changes: every composable
 * (and every `setRouter` bonding) shares the same instance for the app's lifetime.
 */
const moleculeRouters = new WeakMap<VueRouterInstance, Router>()

/**
 * Returns the molecule `Router` for a Vue Router instance, creating it on first use.
 *
 * @param vueRouter - The Vue Router instance.
 * @param routes - Route definitions for molecule named routes; used when the router is
 * first created (later calls with different routes return the existing router unchanged).
 * @returns The molecule `Router` driving that Vue Router.
 */
const routerFor = (vueRouter: VueRouterInstance, routes?: RouteDefinition[]): Router => {
  const existing = moleculeRouters.get(vueRouter)
  if (existing) return existing
  const router = createVueRouter({ router: vueRouter, routes })
  moleculeRouters.set(vueRouter, router)
  return router
}

/**
 * Composable to create and provide a molecule Router.
 *
 * @param routes - Optional route definitions for named routes
 * @returns The molecule Router instance
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useMoleculeRouter } from '@molecule/app-routing-vue-router'
 * import { provide } from 'vue'
 * import { MOLECULE_ROUTER_KEY } from '@molecule/app-routing-vue-router'
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

  // The same Vue Router always gets the same molecule Router: one instance per app, whose
  // subscriptions stay live for its lifetime.
  return computed(() => routerFor(vueRouter, routes))
}

/**
 * Composable that builds the molecule Router from Vue Router AND bonds it as the
 * active singleton via `@molecule/app-routing`'s `setRouter`.
 *
 * Call this ONCE near the app root (e.g. in `App.vue`'s `setup`). One Vue Router gets one
 * molecule Router for the app's lifetime, so `setRouter` runs once, synchronously in
 * setup, and `@molecule/app-routing`'s `navigate()`/`getRouter()` drive the REAL Vue
 * Router (not the core's auto-created fallback browser router) for the rest of the app.
 * Returns the same reactive router ref so you can also use it locally.
 *
 * @param routes - Optional route definitions for molecule named routes.
 * @returns The reactive molecule Router ref (already bonded).
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useMoleculeRouterProvider } from '@molecule/app-routing-vue-router'
 *
 * // Bonds automatically — molecule packages' navigate() now drive Vue Router.
 * const router = useMoleculeRouterProvider()
 *
 * function goToProfile() {
 *   router.value.navigate('/profile')
 * }
 * </script>
 * ```
 */
export function useMoleculeRouterProvider(routes?: RouteDefinition[]): ComputedRef<Router> {
  const router = useMoleculeRouter(routes)

  watch(
    router,
    (currentRouter) => {
      // Bond THIS adapter so @molecule/app-routing's navigate()/getRouter() drive the
      // real Vue Router instead of the core's auto-created fallback browser router.
      setRouter(currentRouter)
    },
    { immediate: true },
  )

  return router
}

/**
 * Composable to get the current location as a reactive ref.
 *
 * @returns Reactive location ref
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useLocation } from '@molecule/app-routing-vue-router'
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
 * import { useParams } from '@molecule/app-routing-vue-router'
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
 * import { useQuery } from '@molecule/app-routing-vue-router'
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
 * import { useNavigate } from '@molecule/app-routing-vue-router'
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
 * import { useIsActive } from '@molecule/app-routing-vue-router'
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
 * import { useRouteChange } from '@molecule/app-routing-vue-router'
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
 * import { useNavigationGuard } from '@molecule/app-routing-vue-router'
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
