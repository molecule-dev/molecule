# @molecule/app-routing-react-navigation

React Navigation routing provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-routing-react-navigation
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

#### `NavigationRef`

Navigation reference type (from `@react-navigation/native`).

```typescript
interface NavigationRef {
  navigate: (name: string, params?: Record<string, unknown>) => void
  goBack: () => void
  canGoBack: () => boolean
  getCurrentRoute: () => { name: string; params?: Record<string, unknown>; key: string } | undefined
  getState: () => NavigationState | undefined
  dispatch: (action: unknown) => void
  addListener: (event: string, callback: (...args: unknown[]) => void) => () => void
}
```

#### `NavigationState`

Navigation state type.

```typescript
interface NavigationState {
  routes: Array<{
    name: string
    key: string
    params?: Record<string, unknown>
    path?: string
  }>
  index: number
}
```

#### `ReactNavigationConfig`

React Navigation-specific configuration.

```typescript
interface ReactNavigationConfig {
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

#### `GuardResult`

Navigation guard result.

```typescript
type GuardResult = boolean | string | {
    path: string;
    replace?: boolean;
} | void;
```

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

#### `createReactNavigationRouter(config)`

Creates a Router backed by React Navigation.

The router translates between URL-based routing (used by molecule's
Router interface) and screen-based routing (used by React Navigation)
via a linking configuration.

```typescript
function createReactNavigationRouter(config: ReactNavigationConfig): Router
```

- `config` — React Navigation configuration including routes, linking, and navigation ref.

**Returns:** A Router implementation backed by React Navigation.

#### `generatePath(pattern, params)`

Generates a concrete path from a pattern with param substitution.

```typescript
function generatePath(pattern: string, params?: RouteParams): string
```

- `pattern` — The route pattern with `:param` placeholders.
- `params` — The parameter values to substitute into the pattern.

**Returns:** The generated path with params substituted and encoded.

#### `matchPath(pattern, pathname, exact)`

Matches a path pattern against a pathname.

```typescript
function matchPath(pattern: string, pathname: string, exact?: boolean): RouteMatch<Params> | null
```

- `pattern` — The route pattern with `:param` placeholders.
- `pathname` — The actual pathname to match against.
- `exact` — Whether to require an exact match (defaults to true).

**Returns:** The route match with extracted params, or null if no match.

#### `parseSearchString(search)`

Parses a URL search string into a QueryParams object.

```typescript
function parseSearchString(search: string): QueryParams
```

- `search` — The URL search string to parse (with or without leading `?`).

**Returns:** The parsed query parameters.

#### `resolvePathFromScreen(screen, params, screens)`

Resolves a URL path from a screen name using linking config.

```typescript
function resolvePathFromScreen(screen: string, params: Record<string, unknown> | undefined, screens: Record<string, string>): string
```

- `screen` — The screen name to resolve.
- `params` — The navigation params from the current route.
- `screens` — The screen-to-pattern linking configuration map.

**Returns:** The resolved URL path.

#### `resolveScreenFromPath(path, screens)`

Resolves a screen name from a URL path using linking config.

```typescript
function resolveScreenFromPath(path: string, screens: Record<string, string>): { screen: string; params?: Record<string, string>; } | null
```

- `path` — The URL path to resolve.
- `screens` — The screen-to-pattern linking configuration map.

**Returns:** The matched screen name and extracted params, or null if no match.

#### `stringifyQuery(params)`

Converts a QueryParams object to a URL search string.

```typescript
function stringifyQuery(params: QueryParams): string
```

- `params` — The query parameters to stringify.

**Returns:** The encoded search string prefixed with `?`, or empty string if no params.

## Core Interface
Implements `@molecule/app-routing` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-routing` ^1.0.0
- `@react-navigation/native` ^7.0.0
- `react` ^18.0.0 || ^19.0.0
- `react-native` >=0.72.0
