/**
 * Type definitions for React Router provider.
 *
 * @module
 */

import type { NavigateFunction } from 'react-router-dom'

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
 * React Router-specific configuration.
 */
export interface ReactRouterConfig {
  /**
   * React Router navigate function (from useNavigate).
   */
  navigate?: NavigateFunction

  /**
   * Current location (from useLocation).
   */
  location?: {
    pathname: string
    search: string
    hash: string
    state?: unknown
    key?: string
  }

  /**
   * Current params (from useParams).
   */
  params?: Record<string, string | undefined>

  /**
   * Initial route definitions.
   */
  routes?: RouteDefinition[]
}

/**
 * React Router hooks adapter.
 */
export interface ReactRouterHooks {
  /**
   * The navigate function from useNavigate.
   */
  navigate: NavigateFunction

  /**
   * Location from useLocation.
   */
  location: {
    pathname: string
    search: string
    hash: string
    state?: unknown
    key?: string
  }

  /**
   * Params from useParams.
   */
  params: Record<string, string | undefined>

  /**
   * Search params from useSearchParams.
   */
  searchParams: URLSearchParams
}
