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
   * @deprecated The router's `currentRoute` is read instead, so the location stays current
   * after every navigation. Accepted for existing apps; unused.
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

/** Characters a Vue Router parameter name may contain. */
type VueParamNameChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'

/**
 * Drops a parenthesised regular expression, counting nested groups and skipping
 * escaped characters.
 *
 * @template S - The text after the opening parenthesis.
 * @template Depth - One tuple entry for each group still open.
 */
type SkipVueRegexp<
  S extends string,
  Depth extends readonly unknown[],
> = S extends `\\${string}${infer R}`
  ? SkipVueRegexp<R, Depth>
  : S extends `(${infer R}`
    ? SkipVueRegexp<R, readonly [...Depth, unknown]>
    : S extends `)${infer R}`
      ? Depth extends readonly [unknown]
        ? R
        : Depth extends readonly [unknown, ...infer Rest]
          ? SkipVueRegexp<R, Rest>
          : R
      : S extends `${string}${infer R}`
        ? SkipVueRegexp<R, Depth>
        : ''

/**
 * Drops the optional `(regex)` that follows a parameter name.
 *
 * @template S - The text after a parameter name.
 */
type SkipVueRegexpGroup<S extends string> = S extends `(${infer R}`
  ? SkipVueRegexp<R, readonly [unknown]>
  : S

/**
 * Reads a parameter name one character at a time, then resumes the scan.
 *
 * @template S - The text from the next unread character.
 * @template Name - The name read so far.
 * @template Found - The names collected before this one.
 */
type ReadVueParamName<
  S extends string,
  Name extends string,
  Found extends string,
> = S extends `${infer C}${infer R}`
  ? VueParamNameChars extends `${string}${C}${string}`
    ? ReadVueParamName<R, `${Name}${C}`, Found>
    : ScanVuePath<SkipVueRegexpGroup<S>, Found | Name>
  : Found | Name

/**
 * Scans a path for the names after each `:`.
 *
 * @template S - The path text still to scan.
 * @template Found - The names collected so far.
 */
type ScanVuePath<S extends string, Found extends string = never> = S extends `:${infer R}`
  ? ReadVueParamName<R, '', Found>
  : S extends `${string}${infer R}`
    ? ScanVuePath<R, Found>
    : Found

/**
 * The parameter names a Vue Router path declares. Covers `:name`, `:name?`,
 * `:name(regex)`, `:name+` and `:name*`. A path that is not a literal declares any name.
 *
 * @template Path - A route path.
 */
export type VueRouteParamName<Path extends string> = string extends Path
  ? string
  : Exclude<ScanVuePath<Path>, ''>

/**
 * The parameters a Vue Router path declares. Every value is a string, or `undefined`
 * when the URL leaves the parameter out.
 *
 * @template Path - A route path.
 */
export type VueRouteParams<Path extends string> = Readonly<{
  [Name in VueRouteParamName<Path>]: string | undefined
}>
