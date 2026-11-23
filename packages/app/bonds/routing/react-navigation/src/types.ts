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
 * The part of a React Navigation container ref this adapter uses: what
 * `createNavigationContainerRef()` from `@react-navigation/native` returns must be
 * assignable to it, so each member is written no narrower than React Navigation 7
 * declares it. Route params are `object` (React Navigation types them
 * `Readonly<object | undefined>`), a dispatched action is React Navigation's action
 * object, and the adapter listens only for the container's `'state'` event.
 */
export interface NavigationRef {
  navigate: (name: string, params?: Record<string, unknown>) => void
  goBack: () => void
  canGoBack: () => boolean
  getCurrentRoute: () => { name: string; params?: object; key: string } | undefined
  getState: () => NavigationState | undefined
  dispatch: (action: NavigationAction) => void
  addListener: (event: 'state', callback: () => void) => () => void
}

/**
 * A React Navigation action, as `navigationRef.dispatch` takes it.
 */
export interface NavigationAction {
  type: string
  payload?: object
  source?: string
  target?: string
}

/**
 * Navigation state type.
 */
export interface NavigationState {
  routes: Array<{
    name: string
    key: string
    params?: object
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
