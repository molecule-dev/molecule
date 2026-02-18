# @molecule/app-routing-next

Next.js App Router provider for molecule.dev.

Provides an adapter for the molecule routing interface that works with
Next.js App Router. This allows using the molecule routing API while
leveraging Next.js navigation features.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-routing-next
```

## API

### Interfaces

#### `MiddlewareGuardRule`

Middleware guard rule configuration.

```typescript
interface MiddlewareGuardRule {
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
```

#### `NavigateOptions`

Options for programmatic navigation (replace vs push, carry state, preserve query/hash).

```typescript
interface NavigateOptions {
    /**
     * Replace current history entry instead of pushing.
     */
    replace?: boolean;
    /**
     * State to pass with navigation.
     */
    state?: unknown;
    /**
     * Preserve current query params.
     */
    preserveQuery?: boolean;
    /**
     * Preserve current hash.
     */
    preserveHash?: boolean;
}
```

#### `NextNavigation`

Next.js navigation types (minimal subset to avoid direct next dependency).

```typescript
interface NextNavigation {
  push(href: string, options?: { scroll?: boolean }): void
  replace(href: string, options?: { scroll?: boolean }): void
  back(): void
  forward(): void
  refresh(): void
  prefetch?(href: string): void
}
```

#### `NextParams`

Next Params interface.

```typescript
interface NextParams {
  [key: string]: string | string[]
}
```

#### `NextRouterConfig`

Configuration options for the Next.js router provider.

```typescript
interface NextRouterConfig extends RouterConfig {
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
```

#### `NextSearchParams`

Next Search Params interface.

```typescript
interface NextSearchParams {
  [key: string]: string | string[] | undefined
}
```

#### `RouteDefinition`

Route configuration entry (path pattern, name, auth requirements, roles, children).

```typescript
interface RouteDefinition {
    /**
     * Route path pattern.
     */
    path: string;
    /**
     * Route name (for named routes).
     */
    name?: string;
    /**
     * Whether the route requires exact matching.
     */
    exact?: boolean;
    /**
     * Whether the route requires authentication.
     */
    requiresAuth?: boolean;
    /**
     * Required roles/permissions.
     */
    roles?: string[];
    /**
     * Route metadata.
     */
    meta?: Record<string, unknown>;
    /**
     * Child routes.
     */
    children?: RouteDefinition[];
}
```

#### `RouteLocation`

Current URL decomposed into pathname, search string, hash, navigation state, and unique key.

```typescript
interface RouteLocation {
    /**
     * Current pathname.
     */
    pathname: string;
    /**
     * Query string (including leading ?).
     */
    search: string;
    /**
     * Hash (including leading #).
     */
    hash: string;
    /**
     * State data passed with navigation.
     */
    state?: unknown;
    /**
     * Unique key for this location.
     */
    key?: string;
}
```

#### `RouteMatch`

Result of matching a URL against a route pattern (path, params, query string).

```typescript
interface RouteMatch<Params extends RouteParams = RouteParams> {
    /**
     * Route path pattern.
     */
    path: string;
    /**
     * Matched URL pathname.
     */
    pathname: string;
    /**
     * Route parameters.
     */
    params: Params;
    /**
     * Whether this is an exact match.
     */
    isExact: boolean;
}
```

#### `Router`

Client-side router providing navigation, guards, route matching, and history control.

All routing providers must implement this interface.

```typescript
interface Router {
    /**
     * Returns the current route location (pathname, search, hash, state).
     */
    getLocation(): RouteLocation;
    /**
     * Gets the current route params.
     */
    getParams<T extends RouteParams = RouteParams>(): T;
    /**
     * Gets the current query params.
     */
    getQuery(): QueryParams;
    /**
     * Gets a specific query parameter.
     */
    getQueryParam(key: string): string | undefined;
    /**
     * Gets the current hash.
     */
    getHash(): string;
    /**
     * Navigates to a path.
     */
    navigate(path: string, options?: NavigateOptions): void;
    /**
     * Navigates to a named route.
     */
    navigateTo(name: string, params?: RouteParams, query?: QueryParams, options?: NavigateOptions): void;
    /**
     * Goes back in history.
     */
    back(): void;
    /**
     * Goes forward in history.
     */
    forward(): void;
    /**
     * Goes to a specific point in history.
     */
    go(delta: number): void;
    /**
     * Updates the current query params.
     */
    setQuery(params: QueryParams, options?: NavigateOptions): void;
    /**
     * Updates a specific query parameter.
     */
    setQueryParam(key: string, value: string | undefined, options?: NavigateOptions): void;
    /**
     * Updates the current hash.
     */
    setHash(hash: string, options?: NavigateOptions): void;
    /**
     * Checks if a path matches the current location.
     *
     * @returns `true` if the path matches the current route.
     */
    isActive(path: string, exact?: boolean): boolean;
    /**
     * Matches a path pattern against a pathname.
     */
    matchPath<Params extends RouteParams = RouteParams>(pattern: string, pathname: string): RouteMatch<Params> | null;
    /**
     * Generates a URL from a named route.
     */
    generatePath(name: string, params?: RouteParams, query?: QueryParams): string;
    /**
     * Subscribes to route changes.
     */
    subscribe(listener: RouteChangeListener): () => void;
    /**
     * Adds a navigation guard.
     */
    addGuard(guard: NavigationGuard): () => void;
    /**
     * Registers route definitions.
     */
    registerRoutes(routes: RouteDefinition[]): void;
    /**
     * Gets all registered routes.
     */
    getRoutes(): RouteDefinition[];
    /**
     * Destroys the router.
     */
    destroy(): void;
}
```

#### `RouterConfig`

Configuration options for creating a router instance.

```typescript
interface RouterConfig {
    /**
     * Router mode.
     */
    mode?: 'history' | 'hash' | 'memory';
    /**
     * Base path.
     */
    basePath?: string;
    /**
     * Initial routes.
     */
    routes?: RouteDefinition[];
}
```

### Types

#### `NavigationGuard`

Navigation guard function invoked before each navigation.
Return `false` to cancel, a string/path to redirect, or void to allow.

```typescript
type NavigationGuard = (to: RouteLocation, from: RouteLocation | null) => GuardResult | Promise<GuardResult>;
```

#### `QueryParams`

URL query string parameter map (single values or arrays for repeated keys).

```typescript
type QueryParams = Record<string, string | string[] | undefined>;
```

#### `RouteChangeListener`

Callback invoked on each route change with the new location and the
navigation action that triggered it.

```typescript
type RouteChangeListener = (location: RouteLocation, action: 'push' | 'replace' | 'pop') => void;
```

#### `RouteParams`

URL path parameter key-value map extracted from dynamic route segments (e.g. `{ id: '123' }`).

```typescript
type RouteParams = Record<string, string>;
```

### Functions

#### `createLinkHref(pathname, query, hash)`

Creates a Next.js link href with query params.

```typescript
function createLinkHref(pathname: string, query?: QueryParams, hash?: string): string
```

- `pathname` — The base path (e.g. `'/products'`).
- `query` — Optional query parameters to append as a search string.
- `hash` — Optional hash fragment (with or without leading `#`).

**Returns:** The assembled href string with path, query, and hash.

#### `createMiddlewareGuard(rules)`

Next.js middleware helper for route guards.

```typescript
function createMiddlewareGuard(rules: MiddlewareGuardRule[]): (request: { url: string; nextUrl: { pathname: string; }; cookies: { get: (name: string) => { value: string; } | undefined; }; headers: { get: (name: string) => string | null; }; }) => Promise<{ redirect: string; continue?: undefined; } | { continue: boolean; redirect?: undefined; }>
```

- `rules` — Array of guard rules, each with a `match` pattern (supports `*` wildcards) and an async `check` function.

**Returns:** An async middleware function that returns `{ redirect: string }` or `{ continue: true }`.

#### `createNextRouter(config)`

Creates a Next.js App Router adapter.

```typescript
function createNextRouter(config?: NextRouterConfig): Router
```

- `config` — Configuration with Next.js's `navigation` (from `useRouter()`), `pathname`, `searchParams`, `params`, and optional `routes`.

**Returns:** A molecule `Router` with navigation, guards, query/hash management, and route matching.

#### `dynamicPath(pattern)`

Creates a reusable path builder for Next.js dynamic routes. Replaces `[param]` and
`[...catchAll]` segments with provided values.

```typescript
function dynamicPath(pattern: string): (params: Record<string, string | string[]>) => string
```

- `pattern` — A Next.js route pattern with `[param]` or `[...catchAll]` segments.

**Returns:** A function that accepts params and returns the resolved path string.

#### `parseCatchAllParams(param)`

Normalizes a Next.js catch-all route parameter into a string array.
Handles `undefined` (returns `[]`), a single string, or an existing array.

```typescript
function parseCatchAllParams(param: string | string[] | undefined): string[]
```

- `param` — The catch-all param value from Next.js route params.

**Returns:** An array of path segments.

### Constants

#### `generatePath`

Generates a URL path from a route pattern by substituting named parameters.

```typescript
const generatePath: (pattern: string, params?: RouteParams) => string
```

#### `matchPath`

Matches a route pattern (e.g. `/users/:id`) against a pathname.
Extracts named parameters from the URL.

```typescript
const matchPath: <Params extends RouteParams = RouteParams>(pattern: string, pathname: string, exact?: boolean) => RouteMatch<Params> | null
```

#### `parseQuery`

Parses a URL query string (e.g. `?foo=bar&baz=1`) into a
`QueryParams` object. Duplicate keys produce string arrays.

```typescript
const parseQuery: (search: string) => QueryParams
```

#### `provider`

Default Next.js router provider (basic, no hooks). For full functionality, use
`createNextRouter` with `useRouter`/`usePathname`/`useSearchParams`/`useParams`.

```typescript
const provider: Router
```

#### `stringifyQuery`

Serializes a `QueryParams` object into a query string with leading `?`.
Returns an empty string if no parameters are present.

```typescript
const stringifyQuery: (params: QueryParams) => string
```

## Core Interface
Implements `@molecule/app-routing` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-logger` ^1.0.0
- `@molecule/app-routing` ^1.0.0
