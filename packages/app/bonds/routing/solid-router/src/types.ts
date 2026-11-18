/**
 * Type definitions for the Solid Router provider.
 *
 * @module
 */

import type { LocationChange } from '@solidjs/router'

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

/** One entry of a {@link SolidMemoryHistory}: the state its navigation carried and its key. */
export interface SolidMemoryEntry {
  /** The state the navigation that created the entry carried, or `undefined`. */
  state: unknown
  /** The entry's location key: new for every entry, the same each time the entry is current. */
  key: string
}

/**
 * The memory history a Solid `<MemoryRouter history={…}>` runs on, as
 * {@link createSolidMemoryHistory} makes it: Solid's `MemoryHistory` shape plus each
 * entry's state and key. Solid Router reports no navigation action, so Back, Forward
 * and `go` on a memory router are only observable through the history's own `listen`.
 */
export interface SolidMemoryHistory {
  /** The current entry's URL (`/users/7?x=1#top`). */
  get(): string
  /** The current entry's state and key. */
  entry(): SolidMemoryEntry
  /** Adds (or, with `replace`, replaces) an entry; Solid Router calls it to navigate. */
  set(change: LocationChange): void
  /** Moves one entry back. */
  back(): void
  /** Moves one entry forward. */
  forward(): void
  /** Moves `delta` entries, clamped to the history. */
  go(delta: number): void
  /**
   * Subscribes to the history's moves; each call passes the entry moved to.
   *
   * @param listener - Called after every `set` and every move.
   * @returns A function that unsubscribes the listener.
   */
  listen(listener: (value: string) => void): () => void
}

/**
 * Solid Router-specific options for {@link createSolidRouter}.
 */
export interface SolidRouterOptions {
  /**
   * Initial route definitions for named routes (`Router.navigateTo`) and route params.
   */
  routes?: RouteDefinition[]

  /**
   * The memory history the mounted `<MemoryRouter history={…}>` uses, from
   * {@link createSolidMemoryHistory}: the router reads each entry's state and key from it
   * and hears its moves as pops. Browser routers (`<Router>`, `<HashRouter>`) need no
   * option: their entries live in `history.state` and their pops arrive as `popstate`.
   */
  history?: SolidMemoryHistory
}

/** Characters a Solid Router parameter name may contain. */
type SolidParamNameChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'

/**
 * Reads a parameter name one character at a time, then resumes the scan.
 *
 * @template S - The text from the next unread character.
 * @template Name - The name read so far.
 * @template Found - The names collected before this one.
 */
type ReadSolidParamName<
  S extends string,
  Name extends string,
  Found extends string,
> = S extends `${infer C}${infer R}`
  ? SolidParamNameChars extends `${string}${C}${string}`
    ? ReadSolidParamName<R, `${Name}${C}`, Found>
    : ScanSolidPath<S, Found | Name>
  : Found | Name

/**
 * Scans a path for the names after each `:` or `*`. A bare `*` declares no name.
 *
 * @template S - The path text still to scan.
 * @template Found - The names collected so far.
 */
type ScanSolidPath<S extends string, Found extends string = never> = S extends `:${infer R}`
  ? ReadSolidParamName<R, '', Found>
  : S extends `*${infer R}`
    ? ReadSolidParamName<R, '', Found>
    : S extends `${string}${infer R}`
      ? ScanSolidPath<R, Found>
      : Found

/**
 * The parameter names a Solid Router path declares: `:name`, `:name?` and `*rest`.
 * A path that is not a literal declares any name.
 *
 * @template Path - A route path.
 */
export type SolidRouteParamName<Path extends string> = string extends Path
  ? string
  : Exclude<ScanSolidPath<Path>, ''>

/**
 * The parameters a Solid Router path declares. Every value is a string, or `undefined`
 * when the URL leaves the parameter out.
 *
 * @template Path - A route path.
 */
export type SolidRouteParams<Path extends string> = Readonly<{
  [Name in SolidRouteParamName<Path>]: string | undefined
}>
