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
 * object, and the adapter listens only for the container's `'state'` event. At each of
 * those events it reads the state with `getState()` and the focused route with
 * `getCurrentRoute()`, to report a back as `pop` and a replacement as `replace`.
 */
export interface NavigationRef {
  navigate: (name: string, params?: Record<string, unknown>) => void
  goBack: () => void
  canGoBack: () => boolean
  getCurrentRoute: () => { name: string; params?: object; key: string } | undefined
  getState: () => NavigationState | undefined
  dispatch: (action: NavigationAction) => void
  addListener: (event: 'state', callback: () => void) => () => void
  /**
   * Whether the container has a navigator mounted. The adapter asks before it reads the
   * state when the router is created: React Navigation logs an error for `getState()` and
   * `getCurrentRoute()` called before that. Without it the state is first read at a
   * `'state'` event.
   */
  isReady?: () => boolean
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
 * One route in a navigator's state. A route that is a nested navigator carries that
 * navigator's state in `state`.
 */
export interface NavigationRoute {
  name: string
  key: string
  params?: object
  path?: string
  state?: NavigationState | PartialNavigationState
}

/**
 * The state of one navigator: the routes it keeps and the index of the focused one.
 * `getState()` returns the root navigator's.
 */
export interface NavigationState {
  routes: NavigationRoute[]
  index: number
}

/**
 * The part of its state React Navigation keeps for a nested navigator it is not
 * rendering: its routes may lack keys and the focused index may be missing, in which
 * case React Navigation reads the last route as the focused one.
 */
export interface PartialNavigationState {
  routes: Array<{
    name: string
    key?: string
    params?: object
    path?: string
    state?: PartialNavigationState
  }>
  index?: number
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
