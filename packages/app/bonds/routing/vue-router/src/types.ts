/**
 * Type definitions for Vue Router provider.
 *
 * @module
 */

import type { RouteLocationNormalizedLoaded, Router as VueRouterInstance } from 'vue-router'

import type { RouteDefinition } from '@molecule/app-routing'

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

/**
 * Vue Router-specific configuration.
 */
export interface VueRouterConfig {
  /**
   * Vue Router instance (from useRouter).
   */
  router?: VueRouterInstance

  /**
   * Current route (from useRoute).
   */
  route?: RouteLocationNormalizedLoaded

  /**
   * Initial route definitions for named routes.
   */
  routes?: RouteDefinition[]
}

/**
 * Vue Router composable return type.
 */
export interface VueRouterComposable {
  /**
   * Vue Router instance.
   */
  router: VueRouterInstance

  /**
   * Current route.
   */
  route: RouteLocationNormalizedLoaded
}
