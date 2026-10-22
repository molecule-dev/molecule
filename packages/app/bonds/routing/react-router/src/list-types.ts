import type { NavigateOptions, QueryParams, RouteParams } from './types.js'

/** Where a list filter lives in the URL. Path values take precedence over query values. */
export interface ListRouteFilter {
  /** Query key; defaults to the filter's name when `param` is absent. */
  query?: string
  /** Path parameter supplied by the current route, such as `category` in `/topics/:category`. */
  param?: string
  /** Value returned when neither URL source supplies a value; omitted from generated queries. */
  defaultValue?: string
}

/** A selectable list view, expressed in the app's own route contract. */
export interface ListRouteSelection {
  /** Absolute route pattern, for example `/members/:member/saved`. */
  path: string
  /** Query values identifying this view. An undefined value requires the key to be absent. */
  query?: QueryParams
  /** A protected selection never loads before authentication is confirmed. */
  requiresAuth?: boolean
}

/** Authentication readiness for protected list selections. */
export interface ListRouteAuth {
  /** The auth client's status. Unavailable is distinct from a signed-out session. */
  status: 'loading' | 'authenticated' | 'unauthenticated' | 'unavailable'
  /** App-owned sign-in URL. A signed-out protected visit replaces history with this URL. */
  redirectTo: string
}

/** URL-backed list state configuration; it neither invents nor rewrites the app's route contract. */
export interface ListRouteOptions<
  Filter extends string = string,
  Selection extends string = string,
> {
  /** Fixed number of items per page; defaults to 20. */
  pageSize?: number
  /** Query key for a 1-indexed page; defaults to `page`. Page one omits the key. */
  pageParam?: string
  /** Route pattern for changing path-backed filters when no selections are configured. */
  path?: string
  /** Filters and their URL sources. API-only filters do not belong here. */
  filters?: Record<Filter, ListRouteFilter>
  /** Named views sharing a list. Both path variants and query variants are supported. */
  selections?: Record<Selection, ListRouteSelection>
  /** Tie-breaker when multiple selections match, or fallback when none matches. */
  defaultSelection?: NoInfer<Selection>
  /** Required when a selection is protected. Public views remain public as auth changes. */
  auth?: ListRouteAuth
}

/** A single atomic list navigation. Filter/selection changes reset page unless explicitly supplied. */
export interface ListRouteChange<
  Filter extends string = string,
  Selection extends string = string,
> {
  /** Target page, starting at one. */
  page?: number
  /** Patch of URL filter values. Undefined removes a query filter. */
  filters?: Partial<Record<Filter, string | undefined>>
  /** Target view, resolved through its configured path and query values. */
  selection?: Selection
  /** Optional path parameter changes, for example when opening a different member's saved view. */
  params?: RouteParams
}

/** Reactive list state and navigation, derived directly from React Router's current location. */
export interface ListRouteResult<
  Filter extends string = string,
  Selection extends string = string,
> {
  /** Current 1-indexed page; malformed and non-positive URL values read as page one. */
  page: number
  /** Configured items per page. */
  pageSize: number
  /** Zero-indexed item offset for an API request. */
  offset: number
  /** Current URL filter values, including values supplied by path parameters. */
  filters: Record<Filter, string | undefined>
  /** Matching view, or the configured fallback. */
  selection: Selection | undefined
  /** Decoded current path parameters, also usable as API-only filters. */
  params: RouteParams
  /** False while a protected selection is awaiting auth, signed out, or unavailable. */
  canLoad: boolean
  /** Readiness for the current view. A public view always stays ready. */
  status: 'ready' | 'loading' | 'unauthenticated' | 'unavailable'
  /** Sign-in destination while a signed-out protected view is being redirected. */
  redirectTo: string | undefined
  /** Build a real link target, preserving the current pathname, unrelated query values and hash. */
  href: (change?: ListRouteChange<Filter, Selection>) => string
  /** Navigate atomically. Location state is preserved unless options explicitly replace it. */
  navigate: (change: ListRouteChange<Filter, Selection>, options?: NavigateOptions) => void
  /** Change only the page, retaining the current filters and view. */
  setPage: (page: number, options?: NavigateOptions) => void
  /** Patch URL filters and return to page one. */
  setFilters: (
    filters: Partial<Record<Filter, string | undefined>>,
    options?: NavigateOptions,
  ) => void
  /** Select a configured view at page one, preserving current route parameters. */
  select: (selection: Selection, options?: NavigateOptions) => void
}
