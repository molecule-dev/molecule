/**
 * React Navigation routing provider for molecule.dev.
 *
 * @module
 */

export { createReactNavigationRouter } from './provider.js'
export type { NavigationRef, NavigationState, ReactNavigationConfig } from './types.js'
export {
  generatePath,
  matchPath,
  parseSearchString,
  resolvePathFromScreen,
  resolveScreenFromPath,
  stringifyQuery,
} from './utilities.js'

// Re-export core types
export type {
  GuardResult,
  NavigateOptions,
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
