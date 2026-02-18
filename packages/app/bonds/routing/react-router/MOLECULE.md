# @molecule/app-routing-react-router

React Router v7 provider for `@molecule/app-routing`.

This package provides a React Router implementation of the molecule Router interface,
allowing you to use molecule's routing abstractions with React Router.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-routing-react-router
```

## Usage

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { MoleculeRouterProvider } from '@molecule/app-routing-react-router'

function App() {
  return (
    <BrowserRouter>
      <MoleculeRouterProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/users/:id" element={<UserProfile />} />
        </Routes>
      </MoleculeRouterProvider>
    </BrowserRouter>
  )
}
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

#### `ReactRouterConfig`

React Router-specific configuration.

```typescript
interface ReactRouterConfig {
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
```

#### `ReactRouterHooks`

React Router hooks adapter.

```typescript
interface ReactRouterHooks {
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

#### `createReactRouter(config)`

Creates a React Router adapter that implements the molecule Router interface.

```typescript
function createReactRouter(config?: ReactRouterConfig): Router
```

- `config` — Configuration with React Router's `navigate` function, `location`, `params`, and optional `routes`.

**Returns:** A molecule `Router` with navigation, guards, query/hash management, and route matching.

#### `generatePath(pattern, params)`

Generates a concrete path from a route pattern by replacing `:param` segments with values.
Throws if a required param is missing.

```typescript
function generatePath(pattern: string, params?: RouteParams): string
```

- `pattern` — The route pattern (e.g. `'/users/:id'`).
- `params` — A map of param names to values.

**Returns:** The resolved path string with params URL-encoded.

#### `matchPath(pattern, pathname, exact)`

Matches a path pattern (with `:param` segments and `*` wildcards) against a pathname.

```typescript
function matchPath(pattern: string, pathname: string, exact?: boolean): RouteMatch<Params> | null
```

- `pattern` — The route pattern (e.g. `'/users/:id'`).
- `pathname` — The actual URL pathname to test.
- `exact` — Whether to require an exact match (default `true`). Set to `false` for prefix matching.

**Returns:** A `RouteMatch` with extracted params, or `null` if no match.

#### `normalizePath(path)`

Removes trailing slashes from a path. Returns `'/'` for root/empty paths.

```typescript
function normalizePath(path: string): string
```

- `path` — The URL path to normalize.

**Returns:** The path without trailing slashes.

#### `parseSearchParams(searchParams)`

Parses `URLSearchParams` into a molecule `QueryParams` object. Duplicate keys
are collected into arrays.

```typescript
function parseSearchParams(searchParams: URLSearchParams): QueryParams
```

- `searchParams` — The `URLSearchParams` instance (e.g. from `useSearchParams()`).

**Returns:** A `QueryParams` map where duplicate keys become string arrays.

#### `resolvePath(to, fromPathname)`

Resolves a relative path against a base pathname. Absolute paths (starting with `/`) are
returned as-is. Relative paths handle `..` (parent) and `.` (current) segments.

```typescript
function resolvePath(to: string, fromPathname: string): string
```

- `to` — The destination path (absolute or relative).
- `fromPathname` — The current pathname to resolve against.

**Returns:** The resolved absolute path.

#### `stringifyQuery(params)`

Converts a molecule `QueryParams` object to a URL search string (e.g. `?key=val&arr=1&arr=2`).
Omits keys with `undefined` values. Returns empty string if no params.

```typescript
function stringifyQuery(params: QueryParams): string
```

- `params` — The query parameters to stringify.

**Returns:** A URL search string starting with `?`, or empty string if no params.

### Constants

#### `provider`

Default React Router provider (basic, no hooks). For full functionality, use
`createReactRouter` with `useNavigate`/`useLocation`/`useParams`.

```typescript
const provider: Router
```

## Core Interface
Implements `@molecule/app-routing` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-routing` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
- `react-router-dom` ^6.0.0 || ^7.0.0
