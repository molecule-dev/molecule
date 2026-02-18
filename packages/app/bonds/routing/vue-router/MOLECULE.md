# @molecule/app-routing-vue-router

Vue Router provider for `@molecule/app-routing`.

This package provides a Vue Router implementation of the molecule Router interface,
allowing you to use molecule's routing abstractions with Vue Router.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-routing-vue-router
```

## Usage

```vue
<script setup lang="ts">
import { useMoleculeRouter, useLocation } from '@molecule/app-routing-vue-router'

const router = useMoleculeRouter()
const location = useLocation()

function navigateToProfile() {
  router.value.navigate('/profile')
}
</script>

<template>
  <div>
    <p>Current path: {{ location.pathname }}</p>
    <button @click="navigateToProfile">Go to Profile</button>
  </div>
</template>
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

#### `VueRouterComposable`

Vue Router composable return type.

```typescript
interface VueRouterComposable {
  /**
   * Vue Router instance.
   */
  router: VueRouterInstance

  /**
   * Current route.
   */
  route: RouteLocationNormalizedLoaded
}
```

#### `VueRouterConfig`

Vue Router-specific configuration.

```typescript
interface VueRouterConfig {
  /**
   * Vue Router instance (from useRouter).
   */
  router?: VueRouterInstance

  /**
   * Current route (from useRoute).
   */
  route?: RouteLocationNormalizedLoaded

  /**
   * Initial route definitions for named routes.
   */
  routes?: RouteDefinition[]
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

#### `createVueRouter(config)`

Creates a Vue Router adapter that implements the molecule Router interface.

```typescript
function createVueRouter(config?: VueRouterConfig): Router
```

- `config` — Configuration with Vue Router's `router` instance, current `route`, and optional `routes`.

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

#### `normalizeParams(params)`

Normalizes Vue Router params (which may contain `string | string[]`) into molecule
`RouteParams` (plain `string` values). Array values are joined with `'/'`.

```typescript
function normalizeParams(params: Record<string, string | string[]>): RouteParams
```

- `params` — The Vue Router params object from `route.params`.

**Returns:** A flat `RouteParams` map with string values only.

#### `parseVueQuery(query)`

Converts a Vue Router query object (with nullable values) into a molecule `QueryParams` object.
Filters out `null` values and preserves arrays.

```typescript
function parseVueQuery(query: Record<string, LocationQueryValue | LocationQueryValue[]>): QueryParams
```

- `query` — The Vue Router `LocationQuery` object from `route.query`.

**Returns:** A molecule `QueryParams` map with only non-null values.

#### `stringifyQuery(params)`

Converts a molecule `QueryParams` object to a URL search string (e.g. `?key=val&arr=1&arr=2`).
Omits keys with `undefined` values.

```typescript
function stringifyQuery(params: QueryParams): string
```

- `params` — The query parameters to stringify.

**Returns:** A URL search string starting with `?`, or empty string if no params.

#### `toVueQuery(params)`

Converts a molecule `QueryParams` object to a Vue Router `LocationQueryRaw` object.
Omits keys with `undefined` values.

```typescript
function toVueQuery(params: QueryParams): LocationQueryRaw
```

- `params` — The molecule query parameters.

**Returns:** A `LocationQueryRaw` compatible with Vue Router's `router.push({ query })`.

#### `useIsActive(path, exact)`

Composable to check if a path is active.

```typescript
function useIsActive(path: string, exact?: boolean): ComputedRef<boolean>
```

- `path` — Path to check
- `exact` — Whether to require exact match

**Returns:** Reactive boolean ref

#### `useLocation()`

Composable to get the current location as a reactive ref.

```typescript
function useLocation(): ComputedRef<RouteLocation>
```

**Returns:** Reactive location ref

#### `useMoleculeRouter(routes)`

Composable to create and provide a molecule Router.

```typescript
function useMoleculeRouter(routes?: RouteDefinition[]): ComputedRef<Router>
```

- `routes` — Optional route definitions for named routes

**Returns:** The molecule Router instance

#### `useNavigate()`

Composable to get a navigate function.

```typescript
function useNavigate(): (path: string, options?: { replace?: boolean; state?: unknown; }) => void
```

**Returns:** Navigate function

#### `useNavigationGuard(guard)`

Composable to add a navigation guard.

```typescript
function useNavigationGuard(guard: (to: RouteLocation, from: RouteLocation | null) => boolean | string | { path: string; replace?: boolean; } | void | Promise<boolean | string | { path: string; replace?: boolean; } | void>): void
```

- `guard` — Guard function

#### `useParams()`

Composable to get route params as a reactive ref.

```typescript
function useParams(): ComputedRef<T>
```

**Returns:** Reactive params ref

#### `useQuery()`

Composable to get query params as a reactive ref.

```typescript
function useQuery(): ComputedRef<QueryParams>
```

**Returns:** Reactive query params ref

#### `useRouteChange(callback)`

Composable to subscribe to route changes.

```typescript
function useRouteChange(callback: (location: RouteLocation, action: "push" | "replace" | "pop") => void): void
```

- `callback` — Callback to run on route change

### Constants

#### `MOLECULE_ROUTER_KEY`

Symbol for providing molecule router in Vue.

```typescript
const MOLECULE_ROUTER_KEY: typeof MOLECULE_ROUTER_KEY
```

#### `provider`

Default Vue Router provider (basic, no hooks). For full functionality, use
`createVueRouter` with `useRouter`/`useRoute`.

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
- `vue` ^3.4.0
- `vue-router` ^4.3.0
