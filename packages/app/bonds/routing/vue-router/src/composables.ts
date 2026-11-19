/**
 * Vue composables for Vue Router integration.
 *
 * @module
 */

import { computed, type ComputedRef, hasInjectionContext, inject, isRef, watch } from 'vue'
import { type Router as VueRouterInstance, useRouter as useVueRouter } from 'vue-router'

import { I18nError } from '@molecule/app-i18n'
import { type NavigateOptions, setRouter } from '@molecule/app-routing'

import { MOLECULE_ROUTER_KEY } from './context.js'
import { createVueRouter } from './provider.js'
import type { QueryParams, RouteDefinition, RouteLocation, RouteParams, Router } from './types.js'

/**
 * One molecule `Router` per Vue Router instance. The router reads Vue Router's live
 * `currentRoute`, so it never needs rebuilding when the route changes: every composable
 * (and every `setRouter` bonding) shares the same instance for the app's lifetime.
 */
const moleculeRouters = new WeakMap<VueRouterInstance, Router>()

/**
 * The route array each molecule `Router` was last given, by identity. A router created
 * with `routes` records them here, so registering them again — the provider passes the
 * same array through both paths — appends nothing. A later, different array from another
 * `useMoleculeRouter(routes)` call registers onto the same router, as React's hooks do.
 */
const registeredRouteArrays = new WeakMap<Router, readonly RouteDefinition[]>()

/**
 * Registers a route array on a router the first time that exact array reaches it.
 *
 * @param router - The molecule `Router` to register on.
 * @param routes - The route definitions to register.
 */
const registerRoutesOnce = (router: Router, routes: RouteDefinition[]): void => {
  if (registeredRouteArrays.get(router) === routes) return
  registeredRouteArrays.set(router, routes)
  router.registerRoutes(routes)
}

/**
 * Reads a provided value as the molecule `Router` it carries, whether the provider
 * supplied the reactive ref or the router itself.
 *
 * @param provided - The injected value.
 * @returns The molecule `Router`.
 */
const readProvidedRouter = (provided: ComputedRef<Router> | Router): Router =>
  isRef(provided) ? provided.value : provided

/**
 * Returns the molecule `Router` for a Vue Router instance, creating it on first use.
 *
 * @param vueRouter - The Vue Router instance.
 * @param routes - Route definitions for molecule named routes, registered when the
 * router is first created; a later call with a different array registers it too.
 * @returns The molecule `Router` driving that Vue Router.
 */
/**
 * The error every composable throws when no Vue Router is installed where it is called.
 *
 * @returns The error, naming how to install the router.
 */
const outsideRouter = (): I18nError =>
  new I18nError(
    'routing.vueRouter.error.useMoleculeRouterOutsideRouter',
    undefined,
    "`useMoleculeRouter` must be called in a component's `setup` of a Vue app with Vue Router installed. Install it with `app.use(router)`.",
  )

const routerFor = (vueRouter: VueRouterInstance, routes?: RouteDefinition[]): Router => {
  const existing = moleculeRouters.get(vueRouter)
  if (existing) return existing
  const router = createVueRouter({ router: vueRouter, routes })
  moleculeRouters.set(vueRouter, router)
  if (routes) registeredRouteArrays.set(router, routes)
  return router
}

/**
 * Composable to get the molecule `Router` for the current Vue Router.
 *
 * Returns the router a mounted `MoleculeRouterProvider` provides exactly; without one it
 * creates ONE router for the calling Vue Router instance and reuses it for the app's
 * lifetime. Passing `routes` registers them for molecule named routes: the first array
 * creates the router with them, and a later, different array registers onto the same
 * router.
 *
 * @param routes - Optional route definitions for named routes.
 * @returns The reactive molecule Router ref.
 * @throws {I18nError} `routing.vueRouter.error.useMoleculeRouterOutsideRouter` outside a
 * component's `setup` (or `app.runWithContext`) of an app with Vue Router installed.
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
  // A mounted MoleculeRouterProvider answers for every descendant: its router, unchanged.
  // Outside `setup` Vue's `inject` only warns and answers `undefined`.
  if (!hasInjectionContext()) throw outsideRouter()
  const provided = inject(MOLECULE_ROUTER_KEY, undefined)
  if (provided) {
    if (routes) registerRoutesOnce(readProvidedRouter(provided), routes)
    return computed(() => readProvidedRouter(provided))
  }

  const vueRouter: VueRouterInstance | undefined = useVueRouter()
  if (!vueRouter) throw outsideRouter()

  // The same Vue Router always gets the same molecule Router: one instance per app, whose
  // subscriptions stay live for its lifetime.
  const router = routerFor(vueRouter, routes)
  if (routes) registerRoutesOnce(router, routes)
  return computed(() => router)
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
 * @deprecated The name collides with `@molecule/app-vue`'s. Use `useMoleculeRouter()` and
 * read `getLocation()` from it instead.
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
 * @deprecated The name collides with `@molecule/app-vue`'s. Use `useMoleculeRouter()` and
 * read `getParams()` from it instead.
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
 * @deprecated The name collides with `@molecule/app-vue`'s. Use {@link useMoleculeQuery}
 * instead, which returns the same reactive query.
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
 * @deprecated The name collides with `@molecule/app-vue`'s. Use
 * {@link useMoleculeNavigate} instead, which takes molecule's own `NavigateOptions`
 * (`replace`, `state`, `preserveQuery`, `preserveHash`).
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
  return (path: string, options?: NavigateOptions) => {
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
