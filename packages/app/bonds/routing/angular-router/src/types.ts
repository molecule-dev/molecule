/**
 * Type definitions for the Angular Router provider.
 *
 * @module
 */

import type { RouteDefinition } from '@molecule/app-routing'

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
}
