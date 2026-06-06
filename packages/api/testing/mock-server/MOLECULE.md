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
  port: 4000,
})

// Control state programmatically
server.setState('GET /accounts', { state: 'error', statusCode: 500 })
server.setState('GET /transactions', { state: 'empty' })

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
  /** Set the state for a specific endpoint */
  setState: (endpointKey: string, state: ResponseState) => void
  /** Set the default state for all endpoints */
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
  /** Additional delay in ms before responding */
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
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'
```

### Functions

#### `applyDelay(state)`

Apply a delay if specified in the response state.

```typescript
function applyDelay(state: ResponseState): Promise<void>
```

- `state` — The response state that may contain a delay

**Returns:** A promise that resolves after the delay (or immediately if no delay)

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

Generate a future ISO date string within the next N days.

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
standard fields (id, created_at, updated_at, user_id).

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

Get an AppDataPool for a fixtures directory, with caching.

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

**Returns:** The parsed ResponseState

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

Generate a recent ISO date string within the last N days.

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
function stateControlMiddleware(defaultState?: ResponseState): (req: Request, res: Response, next: NextFunction) => void
```

- `defaultState` — The default state to use when no override is provided

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

## Injection Notes

### Requirements

Peer dependencies:
- `zod` >=4.0.0

The server uses deterministic seeded PRNG for stable fixture data, making
screenshot comparisons reliable. Each app type has curated, realistic data
pools (e.g., real bank names, merchant descriptions, product catalogs).
