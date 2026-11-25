/**
 * Vue composable for routing.
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
  ref,
  toValue,
  watch,
} from 'vue'

import { I18nError } from '@molecule/app-i18n'
import type {
  ListRouteOptions,
  ListRouteRedirect,
  ListRouteResult,
  NavigateOptions,
  QueryParams,
  RouteLocation,
  RouteParams,
  Router,
} from '@molecule/app-routing'
import {
  createConsumedSearchParam,
  listRouteRedirect,
  resolveLinkPath,
  resolveListRoute,
} from '@molecule/app-routing'

import { RouterKey } from '../injection-keys.js'
import type { UseRouterResult } from '../types.js'

/**
 * The router the routing composables and `Link` navigate through: the one
 * provided above the caller. Both {@link useRouterInstance} and
 * {@link useLinkRouter} fail through this one function, so the error and its
 * text live in one place.
 *
 * @param router - The router read from injection, or `undefined` with none provided.
 * @returns The router.
 * @throws {I18nError} When no router is provided above the caller: wrap the app in the routing
 * bond's `MoleculeRouterProvider` (`@molecule/app-routing-vue-router`), or pass `router` to
 * `moleculePlugin`.
 */
function requireRouter(router: Router | undefined): Router {
  if (!router) {
    throw new I18nError(
      'vue.error.useRouterOutsideProvider',
      undefined,
      'No router here. Wrap the app in `MoleculeRouterProvider` from the routing bond (`@molecule/app-routing-vue-router`), or pass `router` to `moleculePlugin`. If the app already does this, its routing bond is older than this binding: update it (`npm install @molecule/app-routing-vue-router@latest`).',
    )
  }
  return router
}

/**
 * Composable to access the router from injection.
 *
 * @returns The router
 * @throws {I18nError} When no router is provided above the caller: wrap the app in the routing
 * bond's `MoleculeRouterProvider` (`@molecule/app-routing-vue-router`), or pass `router` to
 * `moleculePlugin`.
 */
export function useRouterInstance(): Router {
  return requireRouter(inject(RouterKey))
}

/**
 * The router a link to `to` navigates through, among the routers provided.
 *
 * @param mounted - The router read from injection, or `undefined` with none provided.
 * @param to - The link's destination: an app path or a URL.
 * @returns The router, or `null` for a URL outside the app with none provided.
 * @throws {I18nError} When `to` is an app path and no router is provided above the caller.
 */
function linkRouter(mounted: Router | undefined, to: string): Router | null {
  // A URL outside the app opens through the browser or the device's URL handler: no router navigates it.
  return resolveLinkPath(to) === null ? (mounted ?? null) : requireRouter(mounted)
}

/**
 * Composable for the router a link navigates through, React's `useLinkRouter`
 * in Vue's idiom: the provided router, or `null` for a URL outside the app when
 * none is provided. The browser, or on a device the URL handler, opens such a
 * URL, so a link to it renders in an app with no router (a widget, a static
 * page). A link to an app path still fails without one: that is how an app
 * that forgot to mount its router finds out.
 *
 * `Link` uses it. With a destination it answers for that one and follows it
 * while the component lives. Without one (the destination is not known in
 * `setup`, as a directive's input is not) it returns a function to call with
 * the destination wherever it is known; call it in `setup`, which reads the
 * injection once.
 *
 * @param to - The link's destination: an app path or a URL, or a ref or getter
 * of one.
 * @returns A computed ref of the router the link navigates through, or `null`
 * for a URL outside the app with no router provided.
 * @throws {I18nError} When `to` is an app path and no router is provided above the caller: the
 * error {@link useRouterInstance} throws, with the same fix.
 *
 * @example
 * ```ts
 * const router = useLinkRouter(() => props.to)
 * return () => h('a', { href: router.value === null ? props.to : routerLinkHref(props.to, router.value) })
 * ```
 */
export function useLinkRouter(to: MaybeRefOrGetter<string>): ComputedRef<Router | null>
/**
 * Reads the router without a destination yet.
 *
 * @returns A function that takes a link's destination and gives the router it
 * navigates through, or `null` for a URL outside the app with no router provided.
 * @throws {I18nError} Never here: the returned function throws for an app path with no router
 * provided, the error {@link useRouterInstance} throws.
 *
 * @example
 * ```ts
 * const linkRouter = useLinkRouter()
 * const router = computed(() => linkRouter(props.to))
 * ```
 */
export function useLinkRouter(): (to: string) => Router | null
export function useLinkRouter(
  to?: MaybeRefOrGetter<string>,
): ComputedRef<Router | null> | ((to: string) => Router | null) {
  // No router provided is a supported state here, so the read passes a default and Vue stays quiet.
  const mounted = inject(RouterKey, undefined)
  if (to === undefined) return (destination) => linkRouter(mounted, destination)
  const router = computed(() => linkRouter(mounted, toValue(to)))
  // Read now, so an app path with no router provided fails in setup, as a composable that needs a provider does.
  void router.value
  return router
}

/**
 * Whether two locations are the same entry at the same address. A key names an entry and its
 * state together; without one, the state is compared by identity.
 *
 * @param a - One location.
 * @param b - The other.
 * @returns Whether they are equal.
 */
const sameLocation = (a: RouteLocation, b: RouteLocation): boolean =>
  a.pathname === b.pathname &&
  a.search === b.search &&
  a.hash === b.hash &&
  a.key === b.key &&
  (a.key !== undefined || Object.is(a.state, b.state))

/**
 * Composable for routing state and actions.
 *
 * @returns Router state and navigation methods
 *
 * @example
 * ```vue
 * <script setup>
 * import { useRouter } from '@molecule/app-vue'
 *
 * const { location, params, navigate, back } = useRouter()
 *
 * function goHome() {
 *   navigate('/home')
 * }
 * </script>
 *
 * <template>
 *   <div>
 *     <p>Current path: {{ location.pathname }}</p>
 *     <button @click="goHome">Go Home</button>
 *     <button @click="back">Back</button>
 *   </div>
 * </template>
 * ```
 */
export function useRouter(): UseRouterResult {
  const router = useRouterInstance()

  // Reactive state
  const currentLocation = ref<RouteLocation>(router.getLocation())
  const currentParams = ref<RouteParams>(router.getParams())
  const currentQuery = ref<QueryParams>(router.getQuery())

  // Subscribe to route changes
  let unsubscribe: (() => void) | null = null

  const refresh = (): void => {
    currentLocation.value = router.getLocation()
    currentParams.value = router.getParams()
    currentQuery.value = router.getQuery()
  }

  // Subscribed at mount (setup also runs on the server, where nothing would unsubscribe). A
  // navigation between setup and mount told no one: a child that redirects in its own
  // onMounted runs first, and core's routers notify synchronously. So read once more.
  onMounted(() => {
    unsubscribe = router.subscribe(refresh)
    if (!sameLocation(currentLocation.value, router.getLocation())) refresh()
  })

  onUnmounted(() => {
    unsubscribe?.()
  })

  // Computed properties
  const location = computed(() => currentLocation.value)
  const params = computed(() => currentParams.value)
  const query = computed(() => currentQuery.value)

  // Actions
  const navigate = (path: string, options?: NavigateOptions): void => router.navigate(path, options)
  const navigateTo = (
    name: string,
    routeParams?: RouteParams,
    query?: QueryParams,
    options?: NavigateOptions,
  ): void => router.navigateTo(name, routeParams, query, options)
  const back = (): void => router.back()
  const forward = (): void => router.forward()
  const isActive = (path: string, exact?: boolean): boolean => router.isActive(path, exact)

  return {
    location,
    params,
    query,
    navigate,
    navigateTo,
    back,
    forward,
    isActive,
  }
}

/**
 * Composable to get the current location.
 *
 * @returns Computed location reference
 */
export function useLocation(): ComputedRef<RouteLocation> {
  const { location } = useRouter()
  return location
}

/**
 * Composable to get route parameters.
 *
 * @returns Computed params reference
 */
export function useParams<T extends Record<string, string> = RouteParams>(): ComputedRef<T> {
  const { params } = useRouter()
  return params as ComputedRef<T>
}

/**
 * Composable to get query parameters.
 *
 * @returns A computed ref containing the current URL query parameters.
 */
export function useQuery<T extends QueryParams = QueryParams>(): ComputedRef<T> {
  const { query } = useRouter()
  return query as ComputedRef<T>
}

/**
 * Composable to get the navigate function.
 *
 * @returns A function that navigates to the given path with optional navigation options.
 */
export function useNavigate(): (path: string, options?: NavigateOptions) => void {
  const router = useRouterInstance()
  return (path: string, options?: NavigateOptions): void => router.navigate(path, options)
}

/**
 * Composable to check if a path is currently active.
 *
 * Both arguments may be reactive (a ref or a getter) and are followed on the
 * same component, the way React re-renders `useIsActive`: the value recomputes
 * on navigation and on an argument change.
 *
 * @param path - The path to check; may be reactive, and a change recomputes.
 * @param exact - Whether to match exactly (default: false); may be reactive.
 * @returns Computed boolean indicating if the path is active
 *
 * @example
 * ```vue
 * <script setup>
 * import { useIsActive } from '@molecule/app-vue'
 *
 * const isHomeActive = useIsActive('/home')
 * const isAboutExact = useIsActive('/about', true)
 * </script>
 *
 * <template>
 *   <nav>
 *     <a href="/home" :class="{ active: isHomeActive }">Home</a>
 *     <a href="/about" :class="{ active: isAboutExact }">About</a>
 *   </nav>
 * </template>
 * ```
 */
export function useIsActive(
  path: MaybeRefOrGetter<string>,
  exact: MaybeRefOrGetter<boolean | undefined> = false,
): ComputedRef<boolean> {
  const router = useRouterInstance()
  const location = useLocation()
  return computed(() => {
    // Access location.value to establish the reactive dependency
    void location.value
    return router.isActive(toValue(path), toValue(exact) ?? false)
  })
}

/**
 * URL-backed pagination, filters and selected views, through whichever routing bond the
 * app wired: the page, the filters and the view live in the URL only, so a reload, a
 * shared link and Back all show the same list. Built on `resolveListRoute` from
 * `@molecule/app-routing`, so every framework binding returns the same result.
 *
 * The options may be reactive (a ref or a getter): an auth status going from
 * `loading` to `unauthenticated` performs the sign-in redirect on the same component,
 * the way React re-renders `useListRoute` with new options.
 *
 * A signed-out visit to a view with `requiresAuth` replaces the entry with
 * `options.auth.redirectTo`, carrying `state.returnTo`; until auth is confirmed
 * `canLoad` is `false`.
 *
 * @param options - Filter sources, view paths, pagination and optional auth readiness.
 * @returns A computed ref of the list state (`page`, `offset`, `filters`, `selection`,
 * `canLoad`) and its link builder and navigation actions.
 * @throws {Error} When `pageSize` is not a positive safe integer, or a protected view
 * has no `auth`.
 *
 * @example
 * ```vue
 * <script setup>
 * import { computed } from 'vue'
 * import { useListRoute, useTranslation } from '@molecule/app-vue'
 *
 * const { t } = useTranslation()
 * const list = useListRoute({ pageSize: 10, filters: { tag: {} } })
 * // Load items from list.value.offset; the page and filters come from the URL.
 * const nextPageHref = computed(() => list.value.href({ page: list.value.page + 1 }))
 * </script>
 *
 * <template>
 *   <a :href="nextPageHref">{{ t('list.nextPage') }}</a>
 * </template>
 * ```
 */
export function useListRoute<Filter extends string = string, Selection extends string = string>(
  options: MaybeRefOrGetter<ListRouteOptions<Filter, Selection>> = {},
): ComputedRef<ListRouteResult<Filter, Selection>> {
  const { location, params, navigate } = useRouter()
  const list = computed(() =>
    resolveListRoute<Filter, Selection>(
      { location: location.value, routeParams: params.value },
      toValue(options),
      navigate,
    ),
  )
  // Resolve once in setup, like React's first render: a bad pageSize or a protected
  // selection without `auth` throws from the composable call itself, not at the first
  // read (which the renderer does after mount, where the throw would be unhandled).
  void list.value
  const redirect = computed(() => listRouteRedirect(list.value, location.value))
  const performRedirect = (next: ListRouteRedirect | undefined): void => {
    if (!next) return
    navigate(next.to, next.options)
  }
  // React's redirect effect runs after every render the redirect target changed in;
  // the watcher covers those changes, and the mounted hook covers a redirect already
  // due at mount (it runs after `useRouter`'s subscription starts, so the navigation
  // reaches this composable's reactive state).
  watch(redirect, performRedirect)
  onMounted(() => performRedirect(redirect.value))
  return list
}

/**
 * Takes a one-time credential (a reset `token`, an OAuth `code`) out of the URL and
 * keeps it in memory, through whichever routing bond the app wired. The parameter is
 * removed with a replace navigation that keeps the path, the hash, the other query
 * values and the location state; the value survives re-renders and later query-only
 * navigation, Back to an entry restores the value consumed there, and a new value
 * arriving on the same mounted route is consumed too.
 *
 * @param name - The query key to consume, for example `token` or `code`.
 * @returns A computed ref of the consumed value (`''` before the parameter was ever
 * present) and a setter (a form clears it after a successful submit).
 *
 * @example
 * ```vue
 * <script setup>
 * import { useConsumedSearchParam, useTranslation } from '@molecule/app-vue'
 *
 * const { t } = useTranslation()
 * const token = useConsumedSearchParam('token')
 * // The form submits token.value[0] after the address no longer contains it,
 * // then clears it with token.value[1]('').
 * </script>
 *
 * <template>
 *   <input v-if="!token[0]" :placeholder="t('auth.resetPassword.token')" />
 * </template>
 * ```
 */
export function useConsumedSearchParam(
  name: string,
): ComputedRef<readonly [string, (value: string) => void]> {
  const param = createConsumedSearchParam(useRouterInstance(), name)
  const value = ref(param.get())
  const unsubscribe = param.subscribe((next) => {
    value.value = next
  })
  let disconnect: (() => void) | null = null
  onMounted(() => {
    disconnect = param.connect()
  })
  onUnmounted(() => {
    unsubscribe()
    disconnect?.()
    disconnect = null
  })
  return computed(() => [value.value, param.set] as const)
}
