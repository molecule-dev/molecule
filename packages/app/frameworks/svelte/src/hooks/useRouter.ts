/**
 * Svelte hooks for routing, porting React's `useRouter` family.
 *
 * @module
 */

import type { Readable } from 'svelte/store'

import type {
  NavigateOptions,
  QueryParams,
  RouteLocation,
  RouteParams,
  Router,
} from '@molecule/app-routing'

import { useRouterInstance } from '../context.js'
import { fieldStore, liveStore } from './live-store.js'

/** What {@link useRouter} returns. */
export interface UseRouterResult {
  /** The current location. */
  location: Readable<RouteLocation>
  /** The current route's path parameters. */
  params: Readable<Record<string, string>>
  /** The current query parameters. */
  query: Readable<QueryParams>
  /** Navigates to a path. */
  navigate: Router['navigate']
  /** Navigates to a named route. */
  navigateTo: Router['navigateTo']
  /** Goes back one history entry. */
  back: Router['back']
  /** Goes forward one history entry. */
  forward: Router['forward']
  /** Whether a path is active (prefix, or exact with `exact`). */
  isActive: Router['isActive']
}

/**
 * Routing state and navigation, React's `useRouter` in Svelte's idiom: call it
 * during component init under `setMoleculeContext({ router })`.
 *
 * @returns Router state as stores and the navigation methods.
 * @example
 * ```svelte
 * <script>
 *   import { useRouter } from '@molecule/app-svelte'
 *   const { location, navigate } = useRouter()
 * </script>
 *
 * <p>Current path: {$location.pathname}</p>
 * <button onclick={() => navigate('/home')}>Go home</button>
 * ```
 */
export function useRouter(): UseRouterResult {
  const router = useRouterInstance()
  const state = liveStore(
    () => ({
      location: router.getLocation(),
      params: router.getParams(),
      query: router.getQuery(),
    }),
    (notify) => router.subscribe(notify),
  )
  return {
    location: fieldStore(state, 'location'),
    params: fieldStore(state, 'params'),
    query: fieldStore(state, 'query'),
    navigate: (path: string, options?: NavigateOptions) => router.navigate(path, options),
    navigateTo: (
      name: string,
      params?: RouteParams,
      query?: QueryParams,
      options?: NavigateOptions,
    ) => router.navigateTo(name, params, query, options),
    back: () => router.back(),
    forward: () => router.forward(),
    isActive: (path: string, exact?: boolean) => router.isActive(path, exact),
  }
}

/**
 * The current location, React's `useLocation` in Svelte's idiom.
 *
 * @returns A readable store of the current route location.
 */
export function useLocation(): Readable<RouteLocation> {
  const { location } = useRouter()
  return location
}

/**
 * The current route's path parameters, React's `useParams` in Svelte's idiom.
 *
 * @param T - The params record type.
 * @returns A readable store of the route parameters.
 */
export function useParams<T extends Record<string, string> = RouteParams>(): Readable<T> {
  const { params } = useRouter()
  return params as Readable<T>
}

/**
 * The current query parameters, React's `useQuery` in Svelte's idiom.
 *
 * @param T - The query record type.
 * @returns A readable store of the query parameters.
 */
export function useQuery<T extends QueryParams = QueryParams>(): Readable<T> {
  const { query } = useRouter()
  return query as Readable<T>
}

/**
 * The navigate function, React's `useNavigate` in Svelte's idiom.
 *
 * @returns A function that navigates to a path.
 */
export function useNavigate(): (path: string, options?: NavigateOptions) => void {
  const router = useRouterInstance()
  return (path: string, options?: NavigateOptions) => router.navigate(path, options)
}

/**
 * Whether a path is active, React's `useIsActive` in Svelte's idiom: a
 * readable store that re-evaluates on every route change.
 *
 * @param path - The path to check.
 * @param exact - Whether to match exactly (default: false).
 * @returns A readable store of whether the path is active.
 */
export function useIsActive(path: string, exact = false): Readable<boolean> {
  const router = useRouterInstance()
  return liveStore(
    () => router.isActive(path, exact),
    (notify) => router.subscribe(notify),
  )
}
