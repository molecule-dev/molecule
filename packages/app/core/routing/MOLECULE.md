# @molecule/app-routing

Client-side routing interface for molecule.dev.

Provides a unified routing API that works across different
routing libraries (React Router, Next.js, Vue Router, etc.).

## Type
`core`

## Installation
```bash
npm install @molecule/app-routing
```

## API

### Interfaces

#### `NavigateOptions`

Options for programmatic navigation (replace vs push, carry state, preserve query/hash).

```typescript
interface NavigateOptions {
  /**
   * Replace current history entry instead of pushing.
   */
  replace?: boolean

  /**
   * State to pass with navigation.
   */
  state?: unknown

  /**
   * Preserve current query params.
   */
  preserveQuery?: boolean

  /**
   * Preserve current hash.
   */
  preserveHash?: boolean
}
```

#### `RouteDefinition`

Route configuration entry (path pattern, name, auth requirements, roles, children).

```typescript
interface RouteDefinition {
  /**
   * Route path pattern.
   */
  path: string

  /**
   * Route name (for named routes).
   */
  name?: string

  /**
   * Whether the route requires exact matching.
   */
  exact?: boolean

  /**
   * Whether the route requires authentication.
   */
  requiresAuth?: boolean

  /**
   * Required roles/permissions.
   */
  roles?: string[]

  /**
   * Route metadata.
   */
  meta?: Record<string, unknown>

  /**
   * Child routes.
   */
  children?: RouteDefinition[]
}
```

#### `RouteLocation`

Current URL decomposed into pathname, search string, hash, navigation state, and unique key.

```typescript
interface RouteLocation {
  /**
   * Current pathname.
   */
  pathname: string

  /**
   * Query string (including leading ?).
   */
  search: string

  /**
   * Hash (including leading #).
   */
  hash: string

  /**
   * State data passed with navigation.
   */
  state?: unknown

  /**
   * Unique key for this location.
   */
  key?: string
}
```

#### `RouteMatch`

Result of matching a URL against a route pattern (path, params, query string).

```typescript
interface RouteMatch<Params extends RouteParams = RouteParams> {
  /**
   * Route path pattern.
   */
  path: string

  /**
   * Matched URL pathname.
   */
  pathname: string

  /**
   * Route parameters.
   */
  params: Params

  /**
   * Whether this is an exact match.
   */
  isExact: boolean
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
  getLocation(): RouteLocation

  /**
   * Gets the current route params.
   */
  getParams<T extends RouteParams = RouteParams>(): T

  /**
   * Gets the current query params.
   */
  getQuery(): QueryParams

  /**
   * Gets a specific query parameter.
   */
  getQueryParam(key: string): string | undefined

  /**
   * Gets the current hash.
   */
  getHash(): string

  /**
   * Navigates to a path.
   */
  navigate(path: string, options?: NavigateOptions): void

  /**
   * Navigates to a named route.
   */
  navigateTo(
    name: string,
    params?: RouteParams,
    query?: QueryParams,
    options?: NavigateOptions,
  ): void

  /**
   * Goes back in history.
   */
  back(): void

  /**
   * Goes forward in history.
   */
  forward(): void

  /**
   * Goes to a specific point in history.
   */
  go(delta: number): void

  /**
   * Updates the current query params.
   */
  setQuery(params: QueryParams, options?: NavigateOptions): void

  /**
   * Updates a specific query parameter.
   */
  setQueryParam(key: string, value: string | undefined, options?: NavigateOptions): void

  /**
   * Updates the current hash.
   */
  setHash(hash: string, options?: NavigateOptions): void

  /**
   * Checks if a path matches the current location.
   *
   * @returns `true` if the path matches the current route.
   */
  isActive(path: string, exact?: boolean): boolean

  /**
   * Matches a path pattern against a pathname.
   */
  matchPath<Params extends RouteParams = RouteParams>(
    pattern: string,
    pathname: string,
  ): RouteMatch<Params> | null

  /**
   * Generates a URL from a named route.
   */
  generatePath(name: string, params?: RouteParams, query?: QueryParams): string

  /**
   * Subscribes to route changes.
   */
  subscribe(listener: RouteChangeListener): () => void

  /**
   * Adds a navigation guard.
   */
  addGuard(guard: NavigationGuard): () => void

  /**
   * Registers route definitions.
   */
  registerRoutes(routes: RouteDefinition[]): void

  /**
   * Gets all registered routes.
   */
  getRoutes(): RouteDefinition[]

  /**
   * Destroys the router.
   */
  destroy(): void
}
```

#### `RouterConfig`

Configuration options for creating a router instance.

```typescript
interface RouterConfig {
  /**
   * Router mode.
   */
  mode?: 'history' | 'hash' | 'memory'

  /**
   * Base path.
   */
  basePath?: string

  /**
   * Initial routes.
   */
  routes?: RouteDefinition[]
}
```

### Types

#### `GuardResult`

Navigation guard result.

```typescript
type GuardResult = boolean | string | { path: string; replace?: boolean } | void
```

#### `NavigationGuard`

Navigation guard function invoked before each navigation.
Return `false` to cancel, a string/path to redirect, or void to allow.

```typescript
type NavigationGuard = (
  to: RouteLocation,
  from: RouteLocation | null,
) => GuardResult | Promise<GuardResult>
```

#### `QueryParams`

URL query string parameter map (single values or arrays for repeated keys).

```typescript
type QueryParams = Record<string, string | string[] | undefined>
```

#### `RouteChangeListener`

Callback invoked on each route change with the new location and the
navigation action that triggered it.

```typescript
type RouteChangeListener = (
  location: RouteLocation,
  action: 'push' | 'replace' | 'pop',
) => void
```

#### `RouteParams`

URL path parameter key-value map extracted from dynamic route segments (e.g. `{ id: '123' }`).

```typescript
type RouteParams = Record<string, string>
```

### Functions

#### `createBrowserRouter(config)`

Creates a browser history-based router using the History API
(or hash mode). Supports navigation guards, named routes,
and route change subscriptions.

```typescript
function createBrowserRouter(config?: RouterConfig): Router
```

- `config` — Router configuration (mode, basePath, initial routes).

**Returns:** A `Router` instance bound to the browser history.

#### `createMemoryRouter(config)`

Creates an in-memory router for testing and SSR environments.
Maintains a synthetic history stack without touching browser APIs.

```typescript
function createMemoryRouter(config?: RouterConfig & { initialEntries?: string[]; }): Router
```

- `config` — Router configuration with optional `initialEntries` for the history stack.

**Returns:** A `Router` instance backed by an in-memory history.

#### `generatePath(pattern, params)`

Generates a URL path from a route pattern by substituting named parameters.

```typescript
function generatePath(pattern: string, params?: RouteParams): string
```

- `pattern` — Route pattern with `:param` placeholders (e.g. `/users/:id`).
- `params` — Parameter values to substitute into the pattern.

**Returns:** The generated path with parameters URL-encoded.

#### `getLocation()`

Returns the current route location from the bonded router.

```typescript
function getLocation(): RouteLocation
```

**Returns:** The current location (pathname, search, hash, state).

#### `getParams()`

Returns the current route parameters from the bonded router.

```typescript
function getParams(): T
```

**Returns:** The current route parameters as a typed record.

#### `getQuery()`

Returns the current query parameters from the bonded router.

```typescript
function getQuery(): QueryParams
```

**Returns:** The current query parameters as a record.

#### `getRouter()`

Retrieves the bonded router. If none is bonded, automatically creates
a browser-based router (in browser environments) or a memory-based
router (in SSR/test environments).

```typescript
function getRouter(): Router
```

**Returns:** The active router instance.

#### `matchPath(pattern, pathname, exact)`

Matches a route pattern (e.g. `/users/:id`) against a pathname.
Extracts named parameters from the URL.

```typescript
function matchPath(pattern: string, pathname: string, exact?: boolean): RouteMatch<Params> | null
```

- `pattern` — Route pattern with `:param` placeholders.
- `pathname` — The actual URL pathname to match against.
- `exact` — If `true`, requires a full match (no trailing segments).

**Returns:** A `RouteMatch` with extracted params, or `null` if no match.

#### `navigate(path, options)`

Navigates to a path using the bonded router.

```typescript
function navigate(path: string, options?: NavigateOptions): void
```

- `path` — The target path to navigate to.
- `options` — Navigation options such as `replace` and `state`.

**Returns:** Nothing.

#### `parseQuery(search)`

Parses a URL query string (e.g. `?foo=bar&baz=1`) into a
`QueryParams` object. Duplicate keys produce string arrays.

```typescript
function parseQuery(search: string): QueryParams
```

- `search` — The query string to parse (with or without leading `?`).

**Returns:** A key-value map of query parameters.

#### `setRouter(router)`

Registers a router as the active singleton. Called by bond packages
(e.g. `@molecule/app-routing-react`) during application startup.

```typescript
function setRouter(router: Router): void
```

- `router` — The router implementation to bond.

#### `stringifyQuery(params)`

Serializes a `QueryParams` object into a query string with leading `?`.
Returns an empty string if no parameters are present.

```typescript
function stringifyQuery(params: QueryParams): string
```

- `params` — The query parameters to serialize.

**Returns:** The query string (e.g. `?foo=bar&baz=1`) or `''`.

## Available Providers

| Provider | Package |
|----------|---------|
| Next.js | `@molecule/app-routing-next` |
| React Router | `@molecule/app-routing-react-router` |
| Vue Router | `@molecule/app-routing-vue-router` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-logger` ^1.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-routing`.
