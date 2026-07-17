# @molecule/api-resource

Base resource patterns for molecule.dev.

Provides CRUD operation factories and request handler utilities for
building RESTful API resources. Every `@molecule/api-resource-*` package
(user, project, device, ...) is built on these factories.

## Quick Start

```typescript
import { z } from 'zod'

import {
  createRequestHandler,
  create,
  read,
  update,
  del,
  query,
  type MoleculeRequest,
} from '@molecule/api-resource'
import { types } from '@molecule/api-resource'
import { basePropsSchema } from '@molecule/api-resource/schema'

// Every resource schema extends basePropsSchema (id/createdAt/updatedAt).
const userSchema = basePropsSchema.extend({ name: z.string(), email: z.string() })
type UserProps = z.infer<typeof userSchema>

// Each CRUD factory takes the resource descriptor and returns an async
// operation, e.g. ({ props }) or ({ id }) => { statusCode, body }
// One descriptor, typed as Resource, drives every CRUD factory:
const userResource: types.Resource = { name: 'User', tableName: 'users', schema: userSchema }

const createUser = create<UserProps>(userResource)
const updateUser = update<UserProps>(userResource)
// read/del type their descriptor with the concrete props — cast the shared one:
const readUser = read(userResource as types.Resource<UserProps>)
const deleteUser = del(userResource as types.Resource<UserProps>)

// Operations do NOT take (req, res) directly — adapt each one by mapping
// request fields (req.body, req.params.id) to its arguments, then wrap
// with createRequestHandler for Express
const requestHandlerMap = {
  create: createRequestHandler(async (req: MoleculeRequest) =>
    await createUser({ props: req.body }),
  ),
  read: createRequestHandler(async (req: MoleculeRequest) =>
    await readUser({ id: req.params.id }),
  ),
  // ...
}
```

## Type
`infrastructure`

## Installation
```bash
npm install @molecule/api-resource @molecule/api-bond @molecule/api-database @molecule/api-i18n @molecule/api-locales-resource @molecule/api-utilities-validation uuid zod
```

## API

### Interfaces

#### `ErrorFallback`

Fallback HTTP response used when a caught error is NOT a molecule-tagged error
(i.e. a genuinely-unexpected failure).

```typescript
interface ErrorFallback {
  /** HTTP status for the fallback (typically 500). */
  status: number
  /** Human-readable fallback message (already localized by the caller). */
  message: string
  /** Machine-readable key the frontend maps to a localized message. */
  errorKey: string
}
```

#### `MoleculeRequest`

Framework-agnostic HTTP request interface. Structurally compatible with Express's
`Request` — Express objects satisfy this interface without adapters, but the type
doesn't depend on Express, allowing use with Fastify, Hono, or Lambda.

```typescript
interface MoleculeRequest {
  body: any
  params: Record<string, string>
  query: Record<string, any>
  headers: Record<string, string | string[] | undefined>
  cookies?: Record<string, string>
  /**
   * Client IP address. Populated by Express (honoring `trust proxy`) and other
   * frameworks; optional because it isn't guaranteed in every adapter. Used for
   * IP-keyed rate limiting on auth endpoints.
   */
  ip?: string
  on?(event: string, listener: (...args: unknown[]) => void): void
}
```

#### `MoleculeResponse`

Framework-agnostic HTTP response interface. Structurally compatible with Express's
`Response` — includes `status()`, `json()`, `send()`, `set()`, cookie methods,
streaming (`write`), and `locals` for per-request data sharing.

```typescript
interface MoleculeResponse {
  status(code: number): this
  json(body: unknown): void
  send(body: unknown): void
  end(): void
  set(headers: Record<string, string>): void
  setHeader(name: string, value: string): void
  cookie(name: string, value: string, options?: Record<string, unknown>): void
  write(chunk: string | Buffer): boolean
  flushHeaders?(): void
  locals: Record<string, any>
}
```

#### `Query`

The available resource query options.

```typescript
interface Query {
  /**
   * The maximum number of query results.
   */
  limit?: number
  /**
   * An indexed property to order the results by.
   */
  orderBy?: `createdAt` | `updatedAt`
  /**
   * The direction to order the results.
   */
  orderDirection?: `asc` | `desc`
  /**
   * Constrains the results to values less than these properties, when provided.
   */
  before?: {
    /**
     * Constrains the results to resources created before the provided timestamp.
     *
     * Usually an ISO 8601 timestamp.
     */
    createdAt?: string
    /**
     * Constrains the results to resources updated before the provided timestamp.
     *
     * Usually an ISO 8601 timestamp.
     */
    updatedAt?: string
  }
  /**
   * Constrains the results to values greater than these properties, when provided.
   */
  after?: {
    /**
     * Constrains the results to resources created after the provided timestamp.
     *
     * Usually an ISO 8601 timestamp.
     */
    createdAt?: string
    /**
     * Constrains the results to resources updated after the provided timestamp.
     *
     * Usually an ISO 8601 timestamp.
     */
    updatedAt?: string
  }
}
```

#### `Response`

Structured response object returned by resource handlers. Contains the HTTP
status code, optional headers, and the response body payload.

```typescript
interface Response {
  /**
   * HTTP status code to return.
   */
  statusCode: number
  /**
   * Optional map of HTTP header keys to values.
   */
  headers?: Record<string, string>
  /**
   * The response payload to return.
   */
  body: any
}
```

### Types

#### `Handler`

A resource handler function that processes a request and returns a structured
response object. If it returns `null` or `undefined`, the request is passed
to the next middleware via `next()`.

```typescript
type Handler = (
  req: MoleculeRequest,
  res: MoleculeResponse,
) => Promise<Response | null | undefined> | Response | null | undefined
```

#### `MoleculeNextFunction`

Framework-agnostic next function. Call with no arguments to pass to the next
middleware, or with an error to trigger error-handling middleware.

```typescript
type MoleculeNextFunction = (err?: unknown) => void
```

#### `MoleculeRequestHandler`

Framework-agnostic middleware function signature matching Express's
`(req, res, next) => void` pattern.

```typescript
type MoleculeRequestHandler = (
  req: MoleculeRequest,
  res: MoleculeResponse,
  next: MoleculeNextFunction,
) => void | Promise<void>
```

### Functions

#### `create(resource, resource, resource, resource)`

Creates a handler to create a resource.

Uses the bonded DataStore from `@molecule/api-database` for database-agnostic operations.

Example usage:
```ts
import { create as resourceCreate } from '@molecule/api-resource'
import type * as types from '../../types.js'

export const create = ({ name, tableName, schema }: types.Resource) => {
  const create = resourceCreate({ name, tableName, schema })

  return async (req: MoleculeRequest) => {
    const props = req.body
    return await create({ props })
  }
}
```

```typescript
function create({
    name,
    tableName,
    schema,
  }: types.Resource<unknown>): ({ props: createProps, id, }: { props: CreateProps; id?: CreatedProps["id"]; }) => Promise<{ statusCode: number; body: { error: string; errorKey: string; props?: undefined; }; } | { statusCode: number; body: { props: CreatedProps; error?: undefined; errorKey?: undefined; }; }>
```

- `resource` — The resource descriptor.
- `resource` — .name - Human-readable resource name used in error messages (e.g. `'User'`).
- `resource` — .tableName - Database table to insert the new row into.
- `resource` — .schema - Zod schema to validate the incoming props against.

**Returns:** A curried async function that accepts `{ props, id? }` and returns a `{ statusCode, body }` response.

#### `createRequestHandler(handler)`

Wraps a resource handler into Express-compatible middleware. Calls the handler,
then applies `statusCode`, `headers`, and `body` to the response. If the handler
returns null/undefined, calls `next()`. Catches errors and forwards them as
i18n-translated error messages.

```typescript
function createRequestHandler(handler: Handler): (req: MoleculeRequest, res: MoleculeResponse, next: MoleculeNextFunction) => Promise<void>
```

- `handler` — The resource handler function to wrap.

**Returns:** An Express-compatible middleware function `(req, res, next) => void`.

#### `del(resource, resource, resource)`

Creates a handler to delete a resource by its `id`.

> **Note:** We use `del` everywhere instead of `delete` since `delete` is a reserved keyword in JavaScript.

Uses the bonded DataStore from `@molecule/api-database` for database-agnostic operations.

Example usage:
```ts
import { del as resourceDel } from '@molecule/api-resource'
import type * as types from '../../types.js'

export const del = ({ name, tableName, schema }: types.Resource) => {
  const del = resourceDel({ name, tableName, schema })

  return async (req: MoleculeRequest) => {
    const id = req.params.id
    return await del({ id })
  }
}
```

```typescript
function del({
    name,
    tableName,
  }: DeletedResource): ({ id, }: { id: Props["id"]; }) => Promise<{ statusCode: number; body: { error: string; errorKey: string; props?: undefined; }; } | { statusCode: number; body: { props: { id: Props["id"]; }; error?: undefined; errorKey?: undefined; }; }>
```

- `resource` — The resource descriptor.
- `resource` — .name - Human-readable resource name used in error messages (e.g. `'User'`).
- `resource` — .tableName - Database table to delete the row from.

**Returns:** A curried async function that accepts `{ id }` and returns a `{ statusCode, body }` response.

#### `query(resource, resource)`

Creates a request handler to be used to query resources.

Uses the bonded DataStore from `@molecule/api-database` for database-agnostic operations.

```typescript
function query({
    tableName,
  }: QueriedResource): (req: MoleculeRequest) => Promise<{ statusCode: number; body: { error: string; errorKey: string; }; } | { statusCode: number; body: Props[]; }>
```

- `resource` — The resource descriptor.
- `resource` — .tableName - Database table to query resources from.

**Returns:** A curried async handler that accepts a `MoleculeRequest` (with query params for pagination/sorting) and returns a `{ statusCode, body }` response.

#### `read(resource, resource)`

Creates a handler to read a resource by its `id`.

Uses the bonded DataStore from `@molecule/api-database` for database-agnostic operations.

Example usage:
```ts
import { read as resourceRead } from '@molecule/api-resource'
import type * as types from '../../types.js'

export const read = ({ name, tableName, schema }: types.Resource) => {
  const read = resourceRead({ name, tableName, schema })

  return async (req: MoleculeRequest) => {
    const id = req.params.id
    return await read({ id })
  }
}
```

```typescript
function read({
    tableName,
  }: ReadResource): ({ id, props, }: { id: ReadProps["id"]; props?: ReadProps; }) => Promise<{ statusCode: number; body: { props: ReadProps; error?: undefined; errorKey?: undefined; }; } | { statusCode: number; body: { error: string; errorKey: string; props?: undefined; }; }>
```

- `resource` — The resource descriptor.
- `resource` — .tableName - Database table to query the resource from.

**Returns:** A curried async function that accepts `{ id, props? }` and returns a `{ statusCode, body }` response.

#### `respondError(res, error, fallback)`

Respond to a caught handler error, honoring molecule's "tagged error" convention.

A tagged error carries BOTH a numeric `statusCode` AND a string `errorKey` — the same
contract `@molecule/api-server-default-express`'s error middleware (`classifyTaggedError`)
uses. Providers throw these for expected, user-actionable conditions — e.g. a
config-missing throw (`503` + `'config.notConfigured'`) when `STRIPE_SECRET_KEY` is unset.

Handlers that catch errors MUST funnel through this instead of a blanket
`res.status(500)`, so a tagged error surfaces its REAL status + errorKey rather than
being flattened to a generic 500. Otherwise the app looks broken at the exact moment the
user tries to use the feature — the worst possible time for a payment (the conversion
path). A swallowed tag is why the middleware-only fix was insufficient: ~185 handlers
catch-and-500, so the tag never reached the middleware.

Tagged errors are logged at `warn` (expected/actionable, not a server fault); everything
else is logged at `error` and returns the caller's `fallback`. Requiring BOTH fields is
deliberate: it keeps arbitrary library errors that merely carry a `.statusCode` (e.g. an
AWS SDK 403) from being surfaced with a status molecule never chose.

```typescript
function respondError(res: MoleculeResponse, error: unknown, fallback: ErrorFallback): void
```

- `res` — The response object.
- `error` — The caught error.
- `fallback` — Status/message/errorKey to use when `error` isn't a tagged error.

#### `update(resource, resource, resource, resource)`

Creates a handler to update a resource by its `id` and some `props`.

Uses the bonded DataStore from `@molecule/api-database` for database-agnostic operations.

Example usage:
```ts
import { update as resourceUpdate } from '@molecule/api-resource'
import type * as types from '../../types.js'

export const update = ({ name, tableName, schema }: types.Resource) => {
  const update = resourceUpdate({ name, tableName, schema })

  return async (req: MoleculeRequest) => {
    const id = req.params.id
    const props = req.body
    return await update({ id, props })
  }
}
```

```typescript
function update({
    name,
    tableName,
    schema,
  }: types.Resource<unknown>): ({ id, props: updateProps, }: { id: UpdatedProps["id"] | types.Props["id"]; props: UpdateProps; }) => Promise<{ statusCode: number; body: { error: string; errorKey: string; props?: undefined; }; } | { statusCode: number; body: { props: UpdatedProps; error?: undefined; errorKey?: undefined; }; }>
```

- `resource` — The resource descriptor.
- `resource` — .name - Human-readable resource name used in error messages (e.g. `'User'`).
- `resource` — .tableName - Database table to update the row in.
- `resource` — .schema - Zod schema to validate the incoming props against.

**Returns:** A curried async function that accepts `{ id, props }` and returns a `{ statusCode, body }` response.

### Constants

#### `i18nRegistered`

Sentinel value confirming that locale translations for the resource package
have been registered (or attempted). Always `true` after this module loads.

```typescript
const i18nRegistered: true
```

#### `querySchema`

The resource query Zod schema.

```typescript
const querySchema: z.ZodObject<{ limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>; orderBy: z.ZodDefault<z.ZodEnum<{ createdAt: "createdAt"; updatedAt: "updatedAt"; }>>; orderDirection: z.ZodDefault<z.ZodEnum<{ asc: "asc"; desc: "desc"; }>>; before: z.ZodOptional<z.ZodObject<{ createdAt: z.ZodOptional<z.ZodString>; updatedAt: z.ZodOptional<z.ZodString>; }, z.core.$strip>>; after: z.ZodOptional<z.ZodObject<{ createdAt: z.ZodOptional<z.ZodString>; updatedAt: z.ZodOptional<z.ZodString>; }, z.core.$strip>>; }, z.core.$strip>
```

### Namespaces

#### `schema`

Members:

- `schema.basePropsSchema` — const: Base Zod schema with the three fields every resource row must have:
- `schema.BaseProps` — type: TypeScript type inferred from `basePropsSchema`, containing `id`, `createdAt`, and `updatedAt`.
- `schema.responseSchema` — function: Creates a Zod schema for the standard `{ statusCode, body }` response
- `schema.resourceSchema` — function: Creates a Zod schema that validates a resource descriptor object
- `schema.validate` — function: Validates data against a Zod schema, throwing an `Error` with a
- `schema.safeParse` — function: Validates data against a Zod schema without throwing. Returns a discriminated
- `schema.partial` — function: Creates a schema where all fields are optional, suitable for validating
- `schema.pick` — function: Creates a schema with only the specified fields, useful for create payloads

#### `types`

Members:

- `types.BaseProps` — type: TypeScript type inferred from `basePropsSchema`, containing `id`, `createdAt`, and `updatedAt`.
- `types.Props` — interface: The resource's properties to be stored in the database.
- `types.Resource` — interface: An object describing the resource.
- `types.ZodResource` — interface: An object describing the resource with a Zod schema.
- `types.Response` — interface: Standard response from resource operations.

#### `utilities`

Members:

- `utilities.getValidProps` — const: Validates resource props against a Zod schema, returning typed valid props or throwing
- `utilities.safeParse` — const: Validates data against a Zod schema without throwing, returning a discriminated union.
- `utilities.validate` — const: Validates data against a Zod schema, throwing a ZodError on failure.
- `utilities.ZodError` — interface: An Error-like class used to store Zod validation issues.
- `utilities.ZodSchema` — interface
- `utilities.isEmail` — const: Basic regex for determining whether or not a string is an email address.
- `utilities.isUuid` — const: Basic regex for determining whether or not a string is a UUID.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-locales-resource` ^1.0.0
- `@molecule/api-utilities-validation` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-database`
- `@molecule/api-i18n`
- `@molecule/api-locales-resource`
- `@molecule/api-utilities-validation`
- `uuid`
- `zod`

Working WITH installed `@molecule/api-resource-*` packages (auth `getUserId`,
table ownership, migrations) — what generated code most often breaks:

- **Auth inside a handler is `const userId = getUserId(res)`, imported from
  `@molecule/api-bonds-default-express`** — NOT from this package (this
  package's `utilities` namespace holds only validation helpers). Return 401
  when it is missing. There is NO `requireAuth` middleware or file to import
  or create; auth is applied at the router level. A route's authorizer may
  also stash the already-loaded row on the response context and hand it to
  `read({ id, props })` to skip a second database fetch.
- **A selected `@molecule/api-resource-*` package OWNS its table AND its
  already-wired routes with a FIXED schema** (e.g. `api-resource-project` owns
  `projects` keyed by `user_id` with a live `/projects` handler). Do NOT write
  a migration that re-creates such a table with a different schema — your
  `CREATE TABLE` shadows theirs (or vice-versa) and the package's still-wired
  handler then 500s (`column "user_id" does not exist`). To model a different
  shape, use a DIFFERENT table name (e.g. `workspace_projects`) + your own
  handler. Check `api/migrations/*` + `api/__setup__/` for tables packages
  already provide.
- **Adding a resource package AFTER scaffold? Copy its migration.** Such a
  package ships its table DDL at `node_modules/@molecule/<pkg>/src/__setup__/*.sql`
  — copy it into `api/migrations/<next-number>_<name>.sql`. Wiring its
  routes/handler alone does NOT create the table: every request 500s with
  "relation does not exist" even though the build type-checks clean. (Only
  packages present at scaffold time get their migration auto-created.)
- **Zod/validation helpers are NAMESPACED exports**, not top-level:
  `schema.basePropsSchema` / `schema.validate` / `schema.safeParse` /
  `schema.partial` / `schema.pick`, and `utilities.getValidProps`
  (re-exported from `@molecule/api-utilities-validation`). Import the
  namespace: `import { schema, utilities } from '@molecule/api-resource'`.

## Translations

Translation strings are provided by `@molecule/api-locales-resource`.
