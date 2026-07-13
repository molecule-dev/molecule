# @molecule/api-mock-server

Mock API server with deterministic fixture data for testing, screenshots, and E2E.

Provides a lightweight Express server that serves realistic fixture responses
for any molecule app type. Supports per-request state control via query params
and headers for testing success, empty, error, and unauthorized states.

## Quick Start

```typescript
import { createMockServer } from '@molecule/api-mock-server'

const server = await createMockServer({
  appType: 'personal-finance',
  fixturesPath: './api/fixtures', // directory of *.json fixture files
  port: 4000,
})

// Control state programmatically ('GET /accounts' and 'GET /api/accounts'
// are equivalent keys)
server.setState('GET /accounts', { state: 'error', statusCode: 500 })
server.setState('GET /transactions', { state: 'empty' })
server.setDefaultState('empty') // flips every endpoint at once

// Undo an endpoint override so ?_state / the default control it again —
// setState(key, { state: 'success' }) is NOT the same thing (see @remarks)
server.clearState('GET /accounts')

// Teardown
await server.close()
```

## Type
`utility`

## Installation
```bash
npm install @molecule/api-mock-server
```

## API

### Interfaces

#### `AppDataPool`

App-specific fixture data pools

```typescript
interface AppDataPool {
  /** App type name */
  appType: string
  /** Resource-keyed fixture data: resource name -> array of records */
  resources: Record<string, FixtureRecord[]>
  /** Report endpoints: endpoint path suffix -> response data */
  reports?: Record<string, unknown>
}
```

#### `AppFixtureSet`

Fixture set for an entire app type

```typescript
interface AppFixtureSet {
  /** App type name */
  appType: string
  /** Endpoint key -> fixture data */
  endpoints: Map<string, EndpointFixture>
}
```

#### `EndpointDefinition`

A single discovered endpoint from handler scanning

```typescript
interface EndpointDefinition {
  /** HTTP method (GET, POST, PUT, DELETE) */
  method: HttpMethod
  /** Full route path (e.g. '/accounts', '/accounts/:id', '/reports/net-worth') */
  path: string
  /** Zod schema for request body (if any) */
  bodySchema?: ZodSchemaDefinition
  /** Whether the endpoint requires authentication */
  requiresAuth: boolean
  /** Expected response shape hints */
  responseHints: ResponseHint
}
```

#### `EndpointFixture`

Fixture data for a single endpoint

```typescript
interface EndpointFixture {
  /** The endpoint definition */
  endpoint: EndpointDefinition
  /** Success response body */
  successResponse: unknown
  /** Empty state response body */
  emptyResponse: unknown
  /** Error response */
  errorResponse: { error: string }
}
```

#### `FixtureConfig`

Configuration for fixture generation

```typescript
interface FixtureConfig {
  /** Number of items to generate for list endpoints */
  listCount?: number
  /** Seed override (default: derived from app type + path) */
  seed?: number
  /** App type for domain-specific data pools */
  appType?: string
}
```

#### `FixtureRecord`

Pre-built fixture record for a specific resource

```typescript
interface FixtureRecord {
  [key: string]: unknown
}
```

#### `HandlerScanResult`

Result of scanning all handlers for an app type

```typescript
interface HandlerScanResult {
  /** App type (e.g. 'personal-finance', 'online-store') */
  appType: string
  /** All discovered endpoints */
  endpoints: EndpointDefinition[]
  /** Resource names discovered (accounts, transactions, etc.) */
  resources: string[]
}
```

#### `MockServer`

Running mock server instance with control methods

```typescript
interface MockServer {
  /** The port the server is listening on */
  port: number
  /** The app type being served */
  appType: string
  /**
   * Set a persistent state override for one endpoint (key: `"METHOD /path"`,
   * e.g. `'GET /accounts'` — the bare and `/api/`-prefixed forms are
   * equivalent keys). This is the HIGHEST-priority source of state for that
   * endpoint. Full per-request precedence (highest first):
   *
   * 1. `setState(endpointKey, ...)` (this method)
   * 2. per-request `?_state` query param / `X-Mock-State` header
   * 3. `setDefaultState(...)` / the server's configured `defaultState`
   *
   * So a forgotten `setState('GET /accounts', { state: 'error' })` left over
   * from an earlier test SILENTLY beats every later `?_state=success` on
   * that endpoint — the request looks like `?_state` is being ignored.
   * **Calling `setState(key, { state: 'success' })` does NOT remove the
   * override** — it replaces it with an override that happens to look like
   * the default, but per-request `?_state`/`X-Mock-State` still can't reach
   * that endpoint (the override still outranks them). Use
   * {@link MockServer.clearState} to actually remove the override and hand
   * control back to per-request/default state. `setDefaultState()` never
   * clears endpoint overrides either — the default is only the fallback used
   * when no endpoint override exists at all.
   * @param endpointKey - `"METHOD /path"`, e.g. `'GET /accounts'`.
   * @param state - The state this endpoint returns for every request until
   *   `setState` is called again, or `clearState`d, for the same key.
   */
  setState: (endpointKey: string, state: ResponseState) => void
  /**
   * Remove a persistent per-endpoint override previously set with
   * {@link MockServer.setState}, restoring per-request `?_state`/
   * `X-Mock-State` (and ultimately `setDefaultState()`) control over that
   * endpoint. Pass the EXACT same key string used in the matching
   * `setState()` call — keys are matched as opaque strings, not normalized,
   * so `setState('GET /accounts', ...)` and `setState('GET /api/accounts',
   * ...)` are independent overrides and each needs its own `clearState()`.
   * Clearing a key with no active override is a harmless no-op.
   * @param endpointKey - The same `"METHOD /path"` key passed to `setState`.
   */
  clearState: (endpointKey: string) => void
  /**
   * Set the fallback state used for any endpoint that has no per-endpoint
   * `setState()` override — see {@link MockServer.setState} for the full
   * precedence chain. A per-request `?_state`/`X-Mock-State` value still
   * wins over this default; only an active `setState()` override outranks
   * both.
   * @param state - The fallback response state for endpoints with no override.
   */
  setDefaultState: (state: 'success' | 'empty' | 'error' | 'unauthorized') => void
  /** Get the fixture set being served */
  getFixtures: () => AppFixtureSet
  /** Close the server */
  close: () => Promise<void>
}
```

#### `MockServerConfig`

Configuration for the mock HTTP server

```typescript
interface MockServerConfig {
  /** App type to serve fixtures for (used for display and handler resolution) */
  appType: string
  /** Path to a directory of JSON fixture files (takes priority over appType for data) */
  fixturesPath?: string
  /** Port to listen on (default 4000) */
  port?: number
  /** Default response delay in ms (default 0) */
  defaultDelay?: number
  /** Default state for all endpoints */
  defaultState?: 'success' | 'empty' | 'error' | 'unauthorized'
  /** Per-endpoint state overrides (key: "METHOD /path") */
  endpointStates?: Record<string, ResponseState>
  /** Path to handler templates directory (auto-detected from appType) */
  handlersPath?: string
  /** Custom fixture data to use instead of auto-generated */
  customFixtures?: AppFixtureSet
  /** Whether to log requests (default true) */
  logging?: boolean
}
```

#### `ResponseHint`

Hints about the response shape extracted from handler analysis

```typescript
interface ResponseHint {
  /** Whether the response is an array (list endpoint) */
  isList: boolean
  /** Whether the response is paginated ({ data, total, page, limit }) */
  isPaginated: boolean
  /** Whether the response includes nested resources */
  hasNestedResources: boolean
  /** Resource name (e.g. 'accounts', 'transactions') */
  resourceName: string
  /**
   * Whether the success response is a single bare object literal
   * (`res.json({ a, b, c })`) rather than a list or `{ data: [] }`
   * envelope — e.g. `/analytics/summary`, `/profile/me`. When true,
   * `responseFields` holds its top-level keys.
   */
  isSingleObject?: boolean
  /** Top-level field names of the success `res.json({...})` object, if extracted */
  responseFields?: string[]
}
```

#### `ResponseState`

Response state for controlling mock behavior

```typescript
interface ResponseState {
  /** The state of the response */
  state: 'success' | 'empty' | 'error' | 'unauthorized'
  /**
   * Additional delay in ms before responding. Clamped to `MAX_MOCK_DELAY_MS`
   * (60s, see {@link applyDelay}) — an oversized value is capped and logged
   * rather than honored verbatim, so it cannot hang a request indefinitely.
   */
  delay?: number
  /** Custom status code override */
  statusCode?: number
}
```

#### `SemanticRule`

A semantic rule for generating realistic values based on field names

```typescript
interface SemanticRule {
  /** Field name pattern (regex) */
  pattern: RegExp
  /** Generator function that produces a realistic value */
  generate: (rng: () => number, index: number) => unknown
}
```

#### `ZodSchemaDefinition`

Serialized Zod schema definition for fixture generation

```typescript
interface ZodSchemaDefinition {
  /** Schema type name (e.g. 'ZodObject', 'ZodString') */
  type: string
  /** Schema shape for objects: field name -> nested schema def */
  shape?: Record<string, ZodSchemaDefinition>
  /** Enum values if applicable */
  enumValues?: string[]
  /** Default value if specified */
  defaultValue?: unknown
  /** Inner type for optional/nullable wrappers */
  innerType?: ZodSchemaDefinition
  /** Element type for arrays */
  elementType?: ZodSchemaDefinition
  /** Constraints (min, max, positive, int, etc.) */
  constraints?: {
    min?: number
    max?: number
    positive?: boolean
    int?: boolean
    minLength?: number
    maxLength?: number
  }
}
```

### Types

#### `HttpMethod`

HTTP methods supported by the mock server

```typescript
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
```

### Functions

#### `applyDelay(state)`

Apply a delay if specified in the response state. The requested delay is
capped at {@link MAX_MOCK_DELAY_MS} — a value above the cap is clamped and
a warning is logged (via `console.warn`, immediately, before waiting —
not after — so the clamp is visible in server logs right when the
oversized delay is requested rather than a minute later).

```typescript
function applyDelay(state: ResponseState): Promise<void>
```

- `state` — The response state that may contain a delay

**Returns:** A promise that resolves after the (possibly clamped) delay, or
 *   immediately if no delay was requested

#### `applySemanticRules(fieldName, rng, index, rules)`

Apply semantic rules to generate a value for a given field name.

```typescript
function applySemanticRules(fieldName: string, rng: () => number, index: number, rules?: SemanticRule[]): unknown
```

- `fieldName` — The name of the field to generate a value for
- `rng` — The seeded random function
- `index` — The item index (for cycling through pools)
- `rules` — Custom rules to apply (defaults to defaultSemanticRules)

**Returns:** The generated value, or undefined if no rule matched

#### `buildFixtureSet(appType, endpoints, fixturesDir)`

Build a complete fixture set for an app type by combining
data pool records with endpoint definitions.

```typescript
function buildFixtureSet(appType: string, endpoints: EndpointDefinition[], fixturesDir?: string): AppFixtureSet | undefined
```

- `appType` — The app type
- `endpoints` — The discovered endpoints from scanning
- `fixturesDir` — Path to the fixtures directory

**Returns:** A complete fixture set, or undefined if no data available

#### `corsMiddleware()`

CORS middleware that sets permissive CORS headers for development.

```typescript
function corsMiddleware(): (req: Request, res: Response, next: NextFunction) => void
```

**Returns:** Express middleware function

#### `createMockServer(config)`

Create and start a mock API server for the given app type.
The server discovers endpoints by scanning handler templates and
serves deterministic fixture data for each discovered route.

```typescript
function createMockServer(config: MockServerConfig): Promise<MockServer>
```

- `config` — Server configuration

**Returns:** A running MockServer instance with control methods

#### `createSeededRandom(seed)`

Create a seeded random number generator using Mulberry32.
Returns a function that produces numbers in [0, 1).

```typescript
function createSeededRandom(seed: number): () => number
```

- `seed` — The seed value

**Returns:** A function that returns the next pseudo-random number

#### `futureDate(rng, daysAhead)`

Generate a "future" ISO date string within the next N days of the fixed
`FIXTURE_NOW` anchor (NOT the wall clock — see `FIXTURE_NOW`).

```typescript
function futureDate(rng: () => number, daysAhead?: number): string
```

- `rng` — The seeded random function
- `daysAhead` — Maximum days in the future (default 365)

**Returns:** An ISO date string

#### `generateFixtures(fixturesDir, appType)`

Generate fixtures from a directory of JSON files without scanning handlers.
Builds standard CRUD endpoints for each resource file and custom endpoints
for each sub-endpoint group.

```typescript
function generateFixtures(fixturesDir: string, appType?: string): AppFixtureSet | undefined
```

- `fixturesDir` — Absolute path to the fixtures directory
- `appType` — App type label (default: derived from directory name)

**Returns:** A fixture set with standard CRUD endpoints, or undefined if no data

#### `generateRecord(schema, rng, index)`

Generate a single conformant record from a schema, enriched with
standard fields (id, created_at, updated_at).

```typescript
function generateRecord(schema: ZodSchemaDefinition | undefined, rng: () => number, index: number): Record<string, unknown>
```

- `schema` — The serialized Zod schema definition
- `rng` — The seeded random function
- `index` — The item index

**Returns:** A record with all schema fields plus standard fields

#### `generateRecords(schema, count, appType, path, config)`

Generate multiple records from a schema definition.

```typescript
function generateRecords(schema: ZodSchemaDefinition | undefined, count: number, appType: string, path: string, config?: FixtureConfig): Record<string, unknown>[]
```

- `schema` — The serialized Zod schema definition
- `count` — Number of records to generate
- `appType` — App type for seed derivation
- `path` — Endpoint path for seed derivation
- `config` — Optional fixture configuration

**Returns:** An array of conformant records

#### `getAppDataPool(fixturesDir, appType)`

Get an AppDataPool for a fixtures directory, with fingerprint-validated
caching: editing/adding/removing a `*.json` fixture file (mtime or size
change) invalidates the cached pool, so a mock server re-created in the
same process serves the fresh data instead of the first load.

```typescript
function getAppDataPool(fixturesDir: string, appType: string): AppDataPool | undefined
```

- `fixturesDir` — Absolute path to the fixtures directory
- `appType` — App type label

**Returns:** The loaded pool, or undefined if directory missing/empty

#### `getResponseBody(state, method, fixture, fixture, fixture, fixture, fixture)`

Get the response body for a given state, using the endpoint fixture data.

```typescript
function getResponseBody(state: ResponseState, method: HttpMethod, fixture: { successResponse: unknown; emptyResponse: unknown; errorResponse: { error: string; }; }): unknown
```

- `state` — The response state
- `method` — The HTTP method
- `fixture` — The fixture data containing success, empty, and error responses
- `fixture` — .successResponse
- `fixture` — .emptyResponse
- `fixture` — .errorResponse
- `fixture` — .errorResponse.error

**Returns:** The response body, or null for 204 responses

#### `getStatusCode(state, method)`

Get the HTTP status code for a given state and method.

```typescript
function getStatusCode(state: ResponseState, method: HttpMethod): number
```

- `state` — The response state
- `method` — The HTTP method

**Returns:** The appropriate HTTP status code

#### `loadFixturesFromDirectory(fixturesDir, appType)`

Load an AppDataPool from a directory of JSON fixture files.

File naming conventions:
- Array files (e.g. `products.json` containing `[...]`) become CRUD resources
- Object files (e.g. `reports.json` containing `{key: ...}`) become sub-endpoint groups
  where each key maps to a GET endpoint

Special filenames are treated as report/sub-endpoint groups (object shape expected):
  `reports.json`, `storefront.json`, `admin.json`

All other files are treated as array resources by default.

```typescript
function loadFixturesFromDirectory(fixturesDir: string, appType: string): AppDataPool | undefined
```

- `fixturesDir` — Absolute path to the fixtures directory
- `appType` — App type label (for the returned pool metadata)

**Returns:** An AppDataPool, or undefined if the directory doesn't exist or is empty

#### `loggingMiddleware()`

Request logging middleware for the mock server.

```typescript
function loggingMiddleware(): (req: Request, res: Response, next: NextFunction) => void
```

**Returns:** Express middleware function

#### `parseState(stateStr)`

Parse a state string into a ResponseState object.

```typescript
function parseState(stateStr: string): ResponseState
```

- `stateStr` — The state string (e.g. 'success', 'error', 'empty', 'unauthorized')

**Returns:** The parsed ResponseState. An unrecognized string falls back to
 *   `DEFAULT_STATES.success` — the same forgiving behavior as the per-request
 *   `?_state` middleware (which additionally labels the response with an
 *   `X-Mock-Invalid-State` header so typos are detectable).

#### `pick(rng, arr)`

Pick a random element from an array using the RNG.

```typescript
function pick(rng: () => number, arr: readonly T[]): T
```

- `rng` — The seeded random function
- `arr` — The array to pick from

**Returns:** A random element from the array

#### `randomDollars(rng, min, max)`

Generate a random dollar amount rounded to cents.

```typescript
function randomDollars(rng: () => number, min: number, max: number): number
```

- `rng` — The seeded random function
- `min` — Minimum value
- `max` — Maximum value

**Returns:** A number rounded to 2 decimal places

#### `randomInt(rng, min, max)`

Pick a random integer in [min, max] inclusive.

```typescript
function randomInt(rng: () => number, min: number, max: number): number
```

- `rng` — The seeded random function
- `min` — Minimum value (inclusive)
- `max` — Maximum value (inclusive)

**Returns:** A random integer in the given range

#### `recentDate(rng, daysBack)`

Generate a "recent" ISO date string within the last N days of the fixed
`FIXTURE_NOW` anchor (NOT the wall clock — see `FIXTURE_NOW`).

```typescript
function recentDate(rng: () => number, daysBack?: number): string
```

- `rng` — The seeded random function
- `daysBack` — Maximum days in the past (default 90)

**Returns:** An ISO date string

#### `resolveHandlersPath(appType, workspaceRoot)`

Resolve the handlers path for a given app type.
Searches standard locations in the mlcl templates directory.

```typescript
function resolveHandlersPath(appType: string, workspaceRoot?: string): string | undefined
```

- `appType` — The app type name
- `workspaceRoot` — The workspace root directory

**Returns:** The resolved handlers path, or undefined if not found

#### `scanHandlers(handlersPath, appType)`

Scan all handler files for a given app type and produce endpoint definitions.

```typescript
function scanHandlers(handlersPath: string, appType: string): HandlerScanResult
```

- `handlersPath` — Path to the handlers directory
- `appType` — The app type name

**Returns:** The scan result with all discovered endpoints

#### `seededUUID(rng)`

Generate a UUID-like string from the RNG (not cryptographically secure).

```typescript
function seededUUID(rng: () => number): string
```

- `rng` — The seeded random function

**Returns:** A UUID v4-like string

#### `seedFromPath(appType, path)`

Derive a deterministic seed from an app type and endpoint path.
The same app+path always produces the same seed, ensuring stable fixture output.

```typescript
function seedFromPath(appType: string, path: string): number
```

- `appType` — The application type (e.g. 'personal-finance')
- `path` — The endpoint path (e.g. '/accounts')

**Returns:** A numeric seed value

#### `stateControlMiddleware(defaultState)`

Express middleware that extracts state control signals from the request
and attaches them to res.locals for the route handler to use.

```typescript
function stateControlMiddleware(defaultState?: ResponseState | (() => ResponseState)): (req: Request, res: Response, next: NextFunction) => void
```

- `defaultState` — The default state to use when no override is provided.

**Returns:** Express middleware function

#### `walkSchema(schema, fieldName, rng, index)`

Walk a serialized Zod schema definition and produce conformant data.

```typescript
function walkSchema(schema: ZodSchemaDefinition, fieldName: string, rng: () => number, index: number): unknown
```

- `schema` — The serialized schema definition
- `fieldName` — The field name (for semantic heuristics)
- `rng` — The seeded random function
- `index` — The item index for list generation

**Returns:** A conformant value matching the schema

### Constants

#### `DEFAULT_STATES`

Default response states for each scenario

```typescript
const DEFAULT_STATES: { readonly success: { readonly state: "success"; }; readonly empty: { readonly state: "empty"; }; readonly error: { readonly state: "error"; readonly statusCode: 500; }; readonly unauthorized: { readonly state: "unauthorized"; readonly statusCode: 401; }; }
```

#### `defaultSemanticRules`

Default semantic rules that match field names to realistic generators.
Rules are checked in order; the first match wins.

```typescript
const defaultSemanticRules: SemanticRule[]
```

#### `FIXTURE_NOW`

Fixed "now" anchor (2026-04-01T12:00:00Z) for all generated dates.

Dates are deliberately anchored to a constant instead of the wall clock so
fixture output is byte-stable across runs (reliable screenshot diffs).
Consequence: "recent"/"future" are relative to this anchor, not the real
current time — never assert generated dates against `Date.now()`.

```typescript
const FIXTURE_NOW: Date
```

#### `MAX_MOCK_DELAY_MS`

Maximum delay, in ms, that {@link applyDelay} will actually wait — a
requested delay above this is clamped (and logged) rather than honored
verbatim. Guards against a stray oversized `?_delay` / `X-Mock-Delay` /
`defaultDelay` / `setState({ delay })` value (e.g. a units mistake
applying `*1000` twice) hanging a request until the CLIENT gives up —
which in an E2E harness presents as an inexplicable page timeout rather
than an obvious mock misconfiguration.

```typescript
const MAX_MOCK_DELAY_MS: 60000
```

## Injection Notes

### Requirements

Peer dependencies:
- `zod` >=4.0.0

)
server.clearState('GET /accounts')

// Teardown
await server.close()
```

@remarks
The server uses deterministic seeded PRNG for stable fixture data, making
screenshot comparisons reliable. Fixture data comes from the JSON files in
`fixturesPath` (array files become CRUD resources; `reports`/`storefront`/
`admin` object files become sub-endpoint groups).

Omitting `fixturesPath` makes the server resolve
`mlcl/templates/apps/<appType>/api/fixtures/` by walking up from `process.cwd()`
— that only works inside the molecule workspace. In a scaffolded project,
always pass `fixturesPath`.

Requests to `/api/*` paths with no matching fixture endpoint return an empty
success (`200 []` for GET) so pages still render — the response carries an
`X-Mock-Unmatched: true` header so a typo'd endpoint can be told apart from
an endpoint that legitimately returned empty data. Similarly, an invalid
`?_state`/`X-Mock-State` value is ignored (the default state is served) but
labeled with an `X-Mock-Invalid-State` response header, so a typo'd state
control is detectable instead of silently looking like "state applied".

State precedence, per request, highest first: (1) an endpoint-level
`server.setState(key, state)` override, (2) a per-request `?_state` query
param / `X-Mock-State` header, (3) `server.setDefaultState(...)` / the
configured `defaultState`. A `setState()` override is PERSISTENT — a
forgotten override from an earlier test silently beats every later
`?_state` on that same endpoint. Calling `setState(key, { state: 'success'
})` again does NOT remove the override (it replaces it with one that looks
like the default, still outranking `?_state`); call `server.clearState(key)`
to actually remove it and hand control back to per-request/default state.
`setDefaultState()` only changes the fallback and never clears endpoint
overrides.

Response delay (`defaultDelay`, `?_delay`/`X-Mock-Delay`, or a `delay` in
`setState`/`setDefaultState`) is capped at `MAX_MOCK_DELAY_MS` (60s) — an
oversized value (e.g. a units mistake applying `*1000` twice) is clamped
and logged with `console.warn` instead of hanging the request until the
client gives up, which in an E2E harness reads as an inexplicable page
timeout rather than a mock misconfiguration.
