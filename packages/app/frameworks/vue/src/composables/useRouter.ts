/**
 * Vue composable for routing.
 *
 * @module
 */

import { computed, type ComputedRef, inject, onMounted, onUnmounted, ref } from 'vue'

import type {
  NavigateOptions,
  QueryParams,
  RouteLocation,
  RouteParams,
  Router,
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
    throw new Error('useRouterInstance requires RouterProvider to be provided')
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
 * import { useRouter } from '`@molecule/app-vue`'
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
 * import { useIsActive } from '`@molecule/app-vue`'
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
