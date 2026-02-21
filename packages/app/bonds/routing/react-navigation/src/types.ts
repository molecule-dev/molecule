/**
 * Type definitions for React Navigation provider.
 *
 * @module
 */

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
 * Navigation reference type (from `@react-navigation/native`).
 */
export interface NavigationRef {
  navigate: (name: string, params?: Record<string, unknown>) => void
  goBack: () => void
  canGoBack: () => boolean
  getCurrentRoute: () => { name: string; params?: Record<string, unknown>; key: string } | undefined
  getState: () => NavigationState | undefined
  dispatch: (action: unknown) => void
  addListener: (event: string, callback: (...args: unknown[]) => void) => () => void
}

/**
 * Navigation state type.
 */
export interface NavigationState {
  routes: Array<{
    name: string
    key: string
    params?: Record<string, unknown>
    path?: string
  }>
  index: number
}

/**
 * React Navigation-specific configuration.
 */
export interface ReactNavigationConfig {
  /**
   * React Navigation ref (from useNavigation or createNavigationContainerRef).
   */
  navigationRef?: NavigationRef

  /**
   * Linking configuration that maps URL paths to screen names.
   * Used to translate between URL-based routing and screen-based routing.
   */
  linking?: {
    /** Map of screen name to URL path pattern. */
    screens: Record<string, string>
  }

  /**
   * Initial route definitions.
   */
  routes?: RouteDefinition[]
}
