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

import { t } from '@molecule/app-i18n'
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
  resolveListRoute,
} from '@molecule/app-routing'

import { RouterKey } from '../injection-keys.js'
import type { UseRouterReturn } from '../types.js'

/**
 * Composable to access the router from injection.
 *
 * @returns The router
 * @throws {Error} Error if used without providing router
 */
export function useRouterInstance(): Router {
  const router = inject(RouterKey)
  if (!router) {
    throw new Error(
      t('vue.error.useRouterOutsideProvider', undefined, {
        defaultValue: 'useRouterInstance must be used within a RouterProvider',
      }),
    )
  }
  return router
}

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
export function useRouter(): UseRouterReturn {
  const router = useRouterInstance()

  // Reactive state
  const currentLocation = ref<RouteLocation>(router.getLocation())
  const currentParams = ref<RouteParams>(router.getParams())
  const currentQuery = ref<QueryParams>(router.getQuery())

  // Subscribe to route changes
  let unsubscribe: (() => void) | null = null

  onMounted(() => {
    unsubscribe = router.subscribe(() => {
      currentLocation.value = router.getLocation()
      currentParams.value = router.getParams()
      currentQuery.value = router.getQuery()
    })
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
 * @param path - The path to check
 * @param exact - Whether to match exactly (default: false)
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
export function useIsActive(path: string, exact = false): ComputedRef<boolean> {
  const router = useRouterInstance()
  const location = useLocation()
  return computed(() => {
    // Access location.value to establish the reactive dependency
    void location.value
    return router.isActive(path, exact)
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
