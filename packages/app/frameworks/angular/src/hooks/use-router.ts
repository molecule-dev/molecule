/**
 * Angular functions for routing, mirroring `useRouter`, `useRouterInstance`,
 * `useLocation`, `useParams`, `useQuery`, `useNavigate` and `useIsActive`
 * from `@molecule/app-react`.
 *
 * @module
 */

import { DestroyRef, inject, type Signal, signal } from '@angular/core'

import type {
  NavigateOptions,
  QueryParams,
  RouteLocation,
  RouteParams,
  Router,
} from '@molecule/app-routing'

import { injectProvider } from '../inject.js'
import { ROUTER } from '../tokens.js'

/**
 * The router registered by `provideMolecule({ router })` or `provideRouter`.
 * Call it in an injection context.
 *
 * @returns The router instance.
 * @throws {Error} When no router is registered.
 */
export function useRouterInstance(): Router {
  return injectProvider(
    ROUTER,
    'useRouterOutsideProvider',
    'useRouterInstance must be used within a RouterProvider',
  )
}

/** One subscription over the router, shared by every field of one hook call. */
interface RouterSubscription {
  readonly location: Signal<RouteLocation>
  readonly params: Signal<RouteParams>
  readonly query: Signal<QueryParams>
}

/**
 * Subscribes to the router once and mirrors location, params and query into
 * signals.
 *
 * @param router - The router to follow.
 * @returns The three location signals.
 */
function followRouter(router: Router): RouterSubscription {
  const location = signal<RouteLocation>(router.getLocation())
  const params = signal<RouteParams>(router.getParams())
  const query = signal<QueryParams>(router.getQuery())
  const stop = router.subscribe(() => {
    location.set(router.getLocation())
    params.set(router.getParams())
    query.set(router.getQuery())
  })
  inject(DestroyRef).onDestroy(stop)
  return {
    location: location.asReadonly(),
    params: params.asReadonly(),
    query: query.asReadonly(),
  }
}

/**
 * What {@link useRouter} returns.
 */
export interface UseRouterResult {
  /** The current route location. */
  readonly location: Signal<RouteLocation>
  /** The current route's path parameters. */
  readonly params: Signal<RouteParams>
  /** The current query parameters. */
  readonly query: Signal<QueryParams>
  /** Navigates to a path. */
  navigate: (path: string, options?: NavigateOptions) => void
  /** Navigates to a named route. */
  navigateTo: (
    name: string,
    params?: RouteParams,
    query?: QueryParams,
    options?: NavigateOptions,
  ) => void
  /** Goes back one history entry. */
  back: () => void
  /** Goes forward one history entry. */
  forward: () => void
  /** Whether a path matches the current route. */
  isActive: (path: string, exact?: boolean) => boolean
}

/**
 * Routing state and actions. Call it in an injection context (a component
 * field initializer or constructor).
 *
 * @returns The location, params and query as signals, and the navigation actions.
 */
export function useRouter(): UseRouterResult {
  const router = useRouterInstance()
  const { location, params, query } = followRouter(router)

  const navigate = (path: string, options?: NavigateOptions): void => {
    router.navigate(path, options)
  }

  const navigateTo = (
    name: string,
    routeParams?: RouteParams,
    query?: QueryParams,
    options?: NavigateOptions,
  ): void => {
    router.navigateTo(name, routeParams, query, options)
  }

  const back = (): void => {
    router.back()
  }
  const forward = (): void => {
    router.forward()
  }
  const isActive = (path: string, exact?: boolean): boolean => router.isActive(path, exact)

  return { location, params, query, navigate, navigateTo, back, forward, isActive }
}

/**
 * The current location alone. Call it in an injection context.
 *
 * @returns A signal of the current route location.
 */
export function useLocation(): Signal<RouteLocation> {
  return followRouter(useRouterInstance()).location
}

/**
 * The current path parameters alone. Call it in an injection context.
 *
 * @returns A signal of the current path parameters.
 */
export function useParams<T extends Record<string, string> = RouteParams>(): Signal<T> {
  return followRouter(useRouterInstance()).params as Signal<T>
}

/**
 * The current query parameters alone. Call it in an injection context.
 *
 * @returns A signal of the current query parameters.
 */
export function useQuery<T extends QueryParams = QueryParams>(): Signal<T> {
  return followRouter(useRouterInstance()).query as Signal<T>
}

/**
 * A navigate function alone. Call it in an injection context.
 *
 * @returns The navigate function.
 */
export function useNavigate(): (path: string, options?: NavigateOptions) => void {
  const router = useRouterInstance()
  return (path: string, options?: NavigateOptions): void => {
    router.navigate(path, options)
  }
}

/**
 * Whether a path is active, re-evaluated on every route change. Call it in an
 * injection context.
 *
 * @param path - The path to check.
 * @param exact - Whether to match exactly (default: `false`).
 * @returns A signal of whether the path is active.
 */
export function useIsActive(path: string, exact = false): Signal<boolean> {
  const router = useRouterInstance()
  const active = signal<boolean>(router.isActive(path, exact))
  const stop = router.subscribe(() => active.set(router.isActive(path, exact)))
  inject(DestroyRef).onDestroy(stop)
  return active.asReadonly()
}
