/**
 * Type definitions for Next.js App Router provider.
 *
 * @module
 */

import type {
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

// Re-export core types
export type {
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
}

/**
 * Next.js navigation types (minimal subset to avoid direct next dependency).
 */
export interface NextNavigation {
  push(href: string, options?: { scroll?: boolean }): void
  replace(href: string, options?: { scroll?: boolean }): void
  back(): void
  forward(): void
  refresh(): void
  prefetch?(href: string): void
}

/**
 * Next Params interface.
 */
export interface NextParams {
  [key: string]: string | string[]
}

/**
 * Next Search Params interface.
 */
export interface NextSearchParams {
  [key: string]: string | string[] | undefined
}

/**
 * Configuration options for the Next.js router provider.
 */
export interface NextRouterConfig {
  /**
   * The app's `basePath`: Next's `<Link>` and `router.push` write it before each path and
   * `usePathname()` leaves it out, so `createHref` writes it too. Defaults to the
   * `next.config` `basePath` the Next build compiles in, so a Next app leaves it unset.
   */
  basePath?: string

  /**
   * Next.js navigation object (from useRouter).
   */
  navigation?: NextNavigation

  /**
   * Current pathname (from usePathname).
   */
  pathname?: string

  /**
   * Current search params (from useSearchParams).
   */
  searchParams?: NextSearchParams

  /**
   * Current dynamic params (from useParams).
   */
  params?: NextParams

  /**
   * Route definitions.
   */
  routes?: RouteDefinition[]
}

/**
 * Middleware guard rule configuration.
 */
export interface MiddlewareGuardRule {
  /**
   * Path pattern to match (supports * wildcards).
   */
  match: string

  /**
   * Check function - return true to allow, string to redirect.
   */
  check: (request: {
    url: string
    pathname: string
    cookies: { get: (name: string) => { value: string } | undefined }
    headers: { get: (name: string) => string | null }
  }) => boolean | string | Promise<boolean | string>
}
