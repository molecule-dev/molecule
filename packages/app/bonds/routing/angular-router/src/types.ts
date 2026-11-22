/**
 * Type definitions for the Angular Router provider.
 *
 * @module
 */

import type { RouteDefinition, Router } from '@molecule/app-routing'

// Re-export core types
export type {
  GuardResult,
  NavigateOptions,
  NavigationAction,
  NavigationGuard,
  QueryParams,
  RouteChangeListener,
  RouteDefinition,
  RouteLocation,
  RouteMatch,
  RouteParams,
  Router,
  RouterConfig,
} from '@molecule/app-routing'

/**
 * Angular Router-specific options: the route definitions the molecule router knows
 * before any {@link Router.registerRoutes} call.
 */
export interface AngularRouterOptions {
  /**
   * Route definitions for named routes ({@link Router.navigateTo},
   * {@link Router.generatePath}) and for resolving params when the native router
   * has no match. Molecule `RouteDefinition`s are independent of Angular's own
   * route config — apps declare Angular's routes with `provideRouter(routes)` and
   * repeat (only) the ones molecule should know by name here.
   */
  routes?: RouteDefinition[]

  /**
   * Called once with the molecule `Router` this provider bonds.
   *
   * `provideMoleculeRouter` bonds the adapter through `@molecule/app-routing`'s
   * `setRouter` when the application bootstraps, so `navigate()`/`getRouter()` from
   * `@molecule/app-routing` drive the real Angular Router; this callback runs at that
   * same moment, once. A second provider, in a route's `providers`, passes its own callback
   * the router the first one bonded, as React's provider inside another does. The options
   * are read when the provider's injector is created, so changing the callback later calls
   * nothing.
   */
  onRouterReady?: (router: Router) => void

  /**
   * Path to replace the current location with on a signed-out GET 401. Defaults to
   * `/login`; `false` turns the redirect off. Read by `provideMoleculeRouter`.
   */
  signInPath?: string | false
}

/**
 * Scans an Angular route path for its parameter segments. Angular reads a segment as a
 * parameter only when the whole segment is `:name`.
 *
 * @template S - The path text still to scan.
 * @template Found - The names collected so far.
 */
type ScanAngularPath<
  S extends string,
  Found extends string = never,
> = S extends `${infer Segment}/${infer Rest}`
  ? ScanAngularPath<Rest, Segment extends `:${infer Name}` ? Found | Name : Found>
  : S extends `:${infer Name}`
    ? Found | Name
    : Found

/**
 * The parameter names an Angular route path declares (`:name`). A path that is not a
 * literal declares any name.
 *
 * @template Path - A route path.
 */
export type AngularRouteParamName<Path extends string> = string extends Path
  ? string
  : Exclude<ScanAngularPath<Path>, ''>

/**
 * The parameters an Angular route path declares. Every value is a string, or
 * `undefined` when the URL leaves the parameter out.
 *
 * @template Path - A route path.
 */
export type AngularRouteParams<Path extends string> = Readonly<{
  [Name in AngularRouteParamName<Path>]: string | undefined
}>
