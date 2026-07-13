# @molecule/api-openapi

OpenAPI 3.1 schema generator + runtime validator + Swagger-UI-
compatible JSON output for any molecule API app.

The package is pure — no I/O, no global state, no DB, no clock
reads. Everything is a function of `(spec, route, payload)`. That
keeps the same code reusable from handlers, fixtures, mock-server
setup, and unit tests.

Three building blocks:

1. **`defineOpenApi(spec)`** — typed builder that fills in defaults
   and returns a fully-populated `OpenApiDoc`.
2. **`routeToOperation(route)`** — converts a route definition
   (zod schemas or pre-built JSON Schema) to an OpenAPI Operation.
3. **`validateRequest(operation, payload)`** — runtime validation
   against the operation's schemas. When zod sources are attached
   via `annotateOperation()`, errors come straight from zod's
   `safeParse` for message fidelity.

The `createOpenApiHandler()` helper turns a doc into a
framework-agnostic `GET /openapi.json` HTTP handler.

## Quick Start

```ts
import {
  type RouteDefinition,
  defineOpenApi,
  routeToOperation,
  addRouteToDoc,
  annotateOperation,
  validateRequest,
  createOpenApiHandler,
} from '@molecule/api-openapi'

const doc = defineOpenApi({ info: { title: 'Demo API', version: '1.0.0' } })

// Pre-built JSON Schema — see @remarks for passing zod schemas.
const route: RouteDefinition = {
  method: 'post',
  path: '/users',
  summary: 'Create user',
  request: {
    body: {
      type: 'object',
      required: ['email', 'name'],
      properties: {
        email: { type: 'string', format: 'email' },
        name: { type: 'string', minLength: 1 },
      },
    },
  },
  response: {
    '201': { type: 'object', properties: { id: { type: 'string', format: 'uuid' } } },
  },
}

const operation = routeToOperation(route)
annotateOperation(route, operation, doc)
addRouteToDoc(doc, route, operation)

const result = validateRequest(operation, { body: { email: 'a@b.co', name: 'Ada' } })
if (result.success === false) console.error(result.errors)

const handler = createOpenApiHandler(doc)
// app.get('/openapi.json', handler)
```

## Type
`utility`

## Installation
```bash
npm install @molecule/api-openapi
```

## API

### Interfaces

#### `JsonSchema`

Permissive JSON Schema shape used inside OpenAPI components and
operations. `properties`, `items`, `allOf`, `oneOf`, `anyOf`, etc.
are all `JsonSchema` so that nested schemas keep the same type.

```typescript
interface JsonSchema {
  /** Type tag — matches OpenAPI 3.1 / JSON Schema draft 2020-12. */
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null'
  /** Reference to a component schema (e.g. `#/components/schemas/User`). */
  $ref?: string
  /** Constant string format (e.g. `email`, `uuid`, `date-time`). */
  format?: string
  /** Property map for object schemas. */
  properties?: Record<string, JsonSchema>
  /** Required property names for object schemas. */
  required?: string[]
  /** Item schema for array schemas. */
  items?: JsonSchema
  /** Enum of allowed literal values. */
  enum?: Array<string | number | boolean | null>
  /** Constant value (single allowed value). */
  const?: string | number | boolean | null
  /** Composition keywords. */
  allOf?: JsonSchema[]
  oneOf?: JsonSchema[]
  anyOf?: JsonSchema[]
  /** Whether properties besides those listed are allowed. */
  additionalProperties?: boolean | JsonSchema
  /** Description for documentation. */
  description?: string
  /** Default value. */
  default?: unknown
  /** Numeric constraints. */
  minimum?: number
  maximum?: number
  exclusiveMinimum?: number
  exclusiveMaximum?: number
  /** String length constraints. */
  minLength?: number
  maxLength?: number
  /** Regex pattern for string schemas. */
  pattern?: string
  /** Array length constraints. */
  minItems?: number
  maxItems?: number
  /** Whether `null` is a permitted value (OpenAPI 3.0 compat shim). */
  nullable?: boolean
  /** Example value(s). */
  example?: unknown
  examples?: unknown[]
  /** Allow extra OpenAPI / JSON Schema keywords without losing the type. */
  [key: string]: unknown
}
```

#### `OpenApiComponents`

Components container (reusable schemas, security schemes, etc.).

```typescript
interface OpenApiComponents {
  schemas?: Record<string, JsonSchema>
  parameters?: Record<string, OpenApiParameter>
  responses?: Record<string, OpenApiResponse>
  requestBodies?: Record<string, OpenApiRequestBody>
  securitySchemes?: Record<string, OpenApiSecurityScheme>
}
```

#### `OpenApiDoc`

A fully-populated OpenAPI 3.1 document, the output of `defineOpenApi()`.

```typescript
interface OpenApiDoc extends OpenApiSpec {
  /** Always `'3.1.0'` for this generator. */
  openapi: '3.1.0'
  paths: Record<string, OpenApiPathItem>
  components: OpenApiComponents
}
```

#### `OpenApiHandlerOptions`

Options for `createOpenApiHandler()`.

```typescript
interface OpenApiHandlerOptions {
  /**
   * Pretty-print the JSON output. Defaults to `false` so prod
   * payloads stay compact; turn on in dev for readable bodies.
   */
  pretty?: boolean
  /**
   * Override the `Content-Type` header (default
   * `application/json; charset=utf-8`).
   */
  contentType?: string
}
```

#### `OpenApiHandlerRequest`

Minimal HTTP-shaped request object accepted by `createOpenApiHandler()`.

```typescript
interface OpenApiHandlerRequest {
  method?: string
}
```

#### `OpenApiHandlerResponse`

Minimal HTTP-shaped response object accepted by `createOpenApiHandler()`.

```typescript
interface OpenApiHandlerResponse {
  setHeader?: (name: string, value: string) => unknown
  status?: (code: number) => OpenApiHandlerResponse
  statusCode?: number
  json?: (body: unknown) => unknown
  send?: (body: unknown) => unknown
  end?: (body?: unknown) => unknown
}
```

#### `OpenApiInfo`

OpenAPI Info object — the top-level metadata block describing the API.

```typescript
interface OpenApiInfo {
  /** Required title of the API. */
  title: string
  /** Required semantic version of the API contract (not the runtime). */
  version: string
  /** Optional human-readable description. */
  description?: string
  /** Optional terms of service URL. */
  termsOfService?: string
  /** Optional contact block. */
  contact?: { name?: string; url?: string; email?: string }
  /** Optional license block. */
  license?: { name: string; url?: string; identifier?: string }
}
```

#### `OpenApiOperation`

OpenAPI Operation object — a single HTTP method on a path.

```typescript
interface OpenApiOperation {
  operationId?: string
  tags?: string[]
  summary?: string
  description?: string
  parameters?: OpenApiParameter[]
  requestBody?: OpenApiRequestBody
  responses: Record<string, OpenApiResponse>
  security?: OpenApiSecurityRequirement[]
  deprecated?: boolean
}
```

#### `OpenApiParameter`

OpenAPI Parameter object (`in`: query, header, path, cookie).

```typescript
interface OpenApiParameter {
  name: string
  in: 'query' | 'header' | 'path' | 'cookie'
  description?: string
  required?: boolean
  schema?: JsonSchema
  example?: unknown
}
```

#### `OpenApiRequestBody`

OpenAPI Request Body object.

```typescript
interface OpenApiRequestBody {
  description?: string
  required?: boolean
  content: Record<string, { schema: JsonSchema; example?: unknown }>
}
```

#### `OpenApiResponse`

OpenAPI Response object.

```typescript
interface OpenApiResponse {
  description: string
  content?: Record<string, { schema: JsonSchema; example?: unknown }>
  headers?: Record<string, { description?: string; schema?: JsonSchema }>
}
```

#### `OpenApiSecurityScheme`

OpenAPI Security Scheme — http/apiKey/oauth2/openIdConnect/mutualTLS.

```typescript
interface OpenApiSecurityScheme {
  type: 'http' | 'apiKey' | 'oauth2' | 'openIdConnect' | 'mutualTLS'
  description?: string
  /** For `http`: scheme name (`bearer`, `basic`). */
  scheme?: string
  /** For `http` bearer: token format hint (`JWT`). */
  bearerFormat?: string
  /** For `apiKey`: parameter location and name. */
  in?: 'query' | 'header' | 'cookie'
  name?: string
  /** For `openIdConnect`: discovery URL. */
  openIdConnectUrl?: string
  /** For `oauth2`: flows configuration (kept open — rarely emitted). */
  flows?: Record<string, unknown>
}
```

#### `OpenApiServer`

OpenAPI Server object describing a base URL the API is served from.

```typescript
interface OpenApiServer {
  /** URL of the server (may contain `{variable}` placeholders). */
  url: string
  /** Free-text description. */
  description?: string
  /** Variable substitutions for `{var}` segments in `url`. */
  variables?: Record<string, { default: string; enum?: string[]; description?: string }>
}
```

#### `OpenApiSpec`

Input to `defineOpenApi()` — what callers pass when constructing a
spec. `paths` may be omitted and built up via `routeToOperation()`.

```typescript
interface OpenApiSpec {
  info: OpenApiInfo
  servers?: OpenApiServer[]
  paths?: Record<string, OpenApiPathItem>
  components?: OpenApiComponents
  security?: OpenApiSecurityRequirement[]
  tags?: Array<{ name: string; description?: string }>
}
```

#### `RequestPayload`

Caller-facing payload to `validateRequest()` — every field is
optional so partial validation works.

```typescript
interface RequestPayload {
  params?: Record<string, unknown>
  query?: Record<string, unknown>
  headers?: Record<string, unknown>
  body?: unknown
}
```

#### `ResponseInput`

Richer response slot allowing a description and explicit content
type. If the value supplied at a status code is just a schema, it is
treated as `{ body: schema, description: 'OK' }`.

```typescript
interface ResponseInput {
  description?: string
  body?: SchemaInput
  contentType?: string
  headers?: Record<string, { description?: string; schema?: JsonSchema }>
}
```

#### `RouteDefinition`

Caller-facing description of a single route used by `routeToOperation()`.
`request.body` and `response.body` accept either a zod schema (auto
converted) or a pre-built `JsonSchema` so handcrafted shapes flow
through unchanged.

```typescript
interface RouteDefinition {
  /** Lowercase HTTP method (`get`, `post`, …). */
  method: HttpMethod
  /** Path with OpenAPI-style placeholders (e.g. `/users/{id}`). */
  path: string
  /** One-line summary for Swagger UI. */
  summary?: string
  /** Long description (markdown allowed by Swagger UI). */
  description?: string
  /** OperationId used by client generators. */
  operationId?: string
  /** Tag(s) used to group operations in Swagger UI. */
  tags?: string[]
  /** Whether the operation is deprecated. */
  deprecated?: boolean
  /** Per-operation security requirements (overrides global). */
  security?: OpenApiSecurityRequirement[]
  /** Request shape — params, query, headers, body. */
  request?: {
    params?: SchemaInput
    query?: SchemaInput
    headers?: SchemaInput
    body?: SchemaInput
    /** Content-type override (default: `application/json`). */
    bodyContentType?: string
    /** Optional human description for the body. */
    bodyDescription?: string
  }
  /** Response shape — keyed by status code. */
  response?: Record<string, SchemaInput | ResponseInput>
}
```

#### `ValidationIssue`

Single validation failure entry.

```typescript
interface ValidationIssue {
  /** Where the failure occurred — `params`, `query`, `headers`, or `body`. */
  in: 'params' | 'query' | 'headers' | 'body'
  /** Dotted path inside that section, e.g. `user.email`. */
  path: string
  /** Human-readable message (from zod or schema validator). */
  message: string
  /** Optional issue code (`invalid_type`, `too_small`, etc.). */
  code?: string
}
```

#### `ZodIssueLike`

Subset of a zod issue we use when reporting validation failures.

```typescript
interface ZodIssueLike {
  path: Array<string | number>
  message: string
  code?: string
}
```

#### `ZodLikeSchema`

Minimal duck-type detection for zod schemas — we don't `import` zod
at the type level here, because the converter accepts any object
with `_def`/`parse`/`safeParse`. Keeps the package decoupled from a
specific zod major version at the consumer boundary.

```typescript
interface ZodLikeSchema {
  _def: { typeName?: string; [key: string]: unknown }
  parse: (input: unknown) => unknown
  safeParse: (
    input: unknown,
  ) => { success: true; data: unknown } | { success: false; error: { issues: ZodIssueLike[] } }
}
```

### Types

#### `HttpMethod`

Lowercase HTTP methods OpenAPI exposes on a path item.

```typescript
type HttpMethod = 'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch' | 'trace'
```

#### `OpenApiPathItem`

OpenAPI Path Item object — operations indexed by HTTP method.

```typescript
type OpenApiPathItem = {
  [K in HttpMethod]?: OpenApiOperation
} & {
  summary?: string
  description?: string
  parameters?: OpenApiParameter[]
}
```

#### `OpenApiSecurityRequirement`

Security requirement block — references a security scheme by name.

```typescript
type OpenApiSecurityRequirement = Record<string, string[]>
```

#### `SchemaInput`

What a caller may pass for a schema slot — either a zod schema, a
pre-built JSON Schema, or `undefined`.

```typescript
type SchemaInput = ZodLikeSchema | JsonSchema | undefined
```

#### `ValidationResult`

Result of `validateRequest()` — discriminated union mirroring the
shape returned by zod's `safeParse`.

```typescript
type ValidationResult =
  | {
      success: true
      data: {
        params?: Record<string, unknown>
        query?: Record<string, unknown>
        headers?: Record<string, unknown>
        body?: unknown
      }
    }
  | {
      success: false
      errors: ValidationIssue[]
    }
```

### Functions

#### `addRouteToDoc(doc, route, operation)`

Add a route's converted operation to an existing OpenAPI document
in place. The operation is keyed by `[normalizedPath][method]`,
preserving any other operations already on the same path.

```typescript
function addRouteToDoc(doc: OpenApiDoc, route: Pick<RouteDefinition, "method" | "path">, operation: OpenApiOperation): OpenApiDoc
```

- `doc` — OpenAPI document to mutate.
- `route` — Route definition to add.
- `operation` — Pre-converted operation (typically from

**Returns:** The same `doc` reference, for chaining.

#### `annotateOperation(route, operation, root)`

Convenience wrapper around `routeToOperation()` that also remembers
the original schemas for use by `validateRequest()`. Importing this
keeps the validator decoupled from how the operation was built.

```typescript
function annotateOperation(route: RouteDefinition, operation: OpenApiOperation, root?: unknown): OpenApiOperation
```

- `route` — Route definition.
- `operation` — Operation already produced by `routeToOperation`.
- `root` — Optional root document for `$ref` resolution during

**Returns:** The same operation, with sources attached.

#### `attachOperationSource(operation, source)`

Attach the unconverted (zod) schemas to an operation so that
`validateRequest` can hand them back to zod for accurate errors.
Called by `routeToOperationWithValidation()` — internal helper.

```typescript
function attachOperationSource(operation: OpenApiOperation, source: OperationSource): OpenApiOperation
```

- `operation` — Operation to annotate.
- `source` — Source schemas to remember.

**Returns:** The same `operation` reference.

#### `createOpenApiHandler(doc, options)`

Create a `GET /openapi.json` HTTP handler that responds with the
supplied OpenAPI document.

The handler:
- Sends `405 Method Not Allowed` for non-`GET` requests.
- Sends `200` + `application/json; charset=utf-8` with the doc
  stringified (optionally pretty).
- Falls back from `res.json` → `res.send` → `res.end` so it works
  with Express, Connect, and bare-Node `http` handlers.

```typescript
function createOpenApiHandler(doc: OpenApiDoc, options?: OpenApiHandlerOptions): (req: OpenApiHandlerRequest, res: OpenApiHandlerResponse) => void
```

- `doc` — The OpenAPI document to serve.
- `options` — Optional formatting/content-type overrides.

**Returns:** A `(req, res) => void` handler.

#### `defineOpenApi(spec)`

Build a complete OpenAPI 3.1 document from a partial spec.

`paths`, `components.schemas`, `components.securitySchemes`, etc.
are filled with empty objects when omitted so downstream code can
mutate them without nil-checks (e.g. `addRouteToDoc`).

```typescript
function defineOpenApi(spec: OpenApiSpec): OpenApiDoc
```

- `spec` — The partial OpenAPI spec to expand.

**Returns:** A fully-populated `OpenApiDoc` with `openapi: '3.1.0'`.

#### `getOperationSource(operation)`

Read the attached source schemas from an operation, or `undefined`
if `attachOperationSource()` was never called.

```typescript
function getOperationSource(operation: OpenApiOperation): OperationSource | undefined
```

- `operation` — Operation to inspect.

**Returns:** The previously attached source, or `undefined`.

#### `isJsonSchema(value)`

Heuristic test for a pre-built JSON Schema object.

Used to disambiguate schema inputs that are not zod schemas — the
converter falls back to passing the value through unchanged in
that case.

```typescript
function isJsonSchema(value: unknown): boolean
```

- `value` — Value to test.

**Returns:** `true` if the value looks like a JSON Schema fragment.

#### `isZodSchema(value)`

Duck-type test for a zod schema (any major version).

We deliberately don't `instanceof` against a specific zod export —
that would couple this package to a single zod release. A zod
schema is uniquely identifiable by having both `_def` and a
`safeParse` function, which are public API on every zod schema.

```typescript
function isZodSchema(value: unknown): boolean
```

- `value` — Possibly-zod schema to test.

**Returns:** `true` if the value looks like a zod schema.

#### `normalizePath(path)`

Convert an Express-style path (`/users/:id`) to OpenAPI form
(`/users/{id}`). Idempotent — already-OpenAPI paths pass through.

```typescript
function normalizePath(path: string): string
```

- `path` — Path string to normalize.

**Returns:** OpenAPI-compatible path.

#### `resolveRef(root, ref)`

Resolve a `$ref` within a root document. Only local refs of the
form `#/components/schemas/Name` (or any other `#/foo/bar` JSON
Pointer) are supported — external refs are left unresolved.

```typescript
function resolveRef(root: unknown, ref: string): unknown
```

- `root` — Root document to resolve against.
- `ref` — Ref string starting with `#/`.

**Returns:** The dereferenced schema, or `undefined` if not found.

#### `routeToOperation(route)`

Convert a `RouteDefinition` to an OpenAPI Operation object. The
caller is responsible for mounting the result on a path item — see
`addRouteToDoc()` in `./defineOpenApi.js` for that step.

```typescript
function routeToOperation(route: RouteDefinition): OpenApiOperation
```

- `route` — Route definition with optional zod / JSON-Schema slots.

**Returns:** OpenAPI Operation object.

#### `validateRequest(operation, payload)`

Validate an incoming request payload against an OpenAPI operation.

If the operation has source zod schemas attached (via
`annotateOperation`), each section is validated by zod's
`safeParse` — issue paths and messages come straight from zod. For
operations that only carry the JSON-Schema form (e.g. handcrafted
specs), a built-in mini-validator runs against the operation's own
`parameters` / `requestBody` definitions.

```typescript
function validateRequest(operation: OpenApiOperation, payload: RequestPayload): ValidationResult
```

- `operation` — Operation describing the expected shape.
- `payload` — Incoming payload — `params`, `query`, `headers`, `body`.

**Returns:** Discriminated union: `success: true` with parsed data, or
 *          `success: false` with an array of `ValidationIssue`s.

#### `zodToJsonSchema(schema)`

Convert a zod schema to a JSON Schema fragment usable inside an
OpenAPI 3.1 document.

Pre-built `JsonSchema` objects pass through unchanged so callers can
mix handcrafted schemas with zod-derived ones.

```typescript
function zodToJsonSchema(schema: ZodLikeSchema | JsonSchema): JsonSchema
```

- `schema` — Zod schema or pre-built JSON Schema.

**Returns:** JSON Schema with the OpenAPI-incompatible `$schema` field removed.

## Injection Notes

for passing zod schemas.
const route: RouteDefinition = {
  method: 'post',
  path: '/users',
  summary: 'Create user',
  request: {
    body: {
      type: 'object',
      required: ['email', 'name'],
      properties: {
        email: { type: 'string', format: 'email' },
        name: { type: 'string', minLength: 1 },
      },
    },
  },
  response: {
    '201': { type: 'object', properties: { id: { type: 'string', format: 'uuid' } } },
  },
}

const operation = routeToOperation(route)
annotateOperation(route, operation, doc)
addRouteToDoc(doc, route, operation)

const result = validateRequest(operation, { body: { email: 'a@b.co', name: 'Ada' } })
if (result.success === false) console.error(result.errors)

const handler = createOpenApiHandler(doc)
// app.get('/openapi.json', handler)
```

@remarks
The validator prefers zod schemas when they're attached via
`annotateOperation()` — this gives you zod's full error messages,
coercion rules, and refinements. Note the TypeScript caveat, though:
zod 4's static types don't structurally satisfy the permissive
`ZodLikeSchema` duck type, so assigning a `z.object(...)` directly
to a `RouteDefinition` schema slot fails `tsc` (the runtime
converter accepts it fine). In typed code, pass pre-built JSON
Schema as in the example, or narrow the zod schema with the
exported `isZodSchema()` guard before assigning it.
For handcrafted JSON Schemas a
built-in mini-validator handles the keywords this package emits
(`type`, `required`, `properties`, `items`, `enum`, `const`,
`pattern`, length and numeric bounds, `additionalProperties`,
`anyOf`/`oneOf`/`allOf`, and local `$ref` resolution).

Path parameters in routes can use either Express (`/users/:id`) or
OpenAPI (`/users/{id}`) syntax — `routeToOperation` and
`addRouteToDoc` normalize them.
