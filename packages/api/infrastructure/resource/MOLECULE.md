# @molecule/api-resource

Base resource patterns for molecule.dev.

Provides CRUD operation factories and request handler utilities for
building RESTful API resources.

## Type
`infrastructure`

## Installation
```bash
npm install @molecule/api-resource
```

## Usage

```typescript
import {
  createRequestHandler,
  create,
  read,
  update,
  del,
  query
} from '@molecule/api-resource'

// Create a handler factory for your resource
const createUser = create<UserProps>({
  name: 'User',
  tableName: 'users',
  schema: userSchema,
})

// Wrap with request handler for Express
export const requestHandlerMap = {
  create: createRequestHandler(createUser),
  read: createRequestHandler(readUser),
  // ...
}
```

## API

### Interfaces

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
import { create as resourceCreate } from '`@molecule/api-resource`'
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
import { del as resourceDel } from '`@molecule/api-resource`'
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
import { read as resourceRead } from '`@molecule/api-resource`'
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

#### `update(resource, resource, resource, resource)`

Creates a handler to update a resource by its `id` and some `props`.

Uses the bonded DataStore from `@molecule/api-database` for database-agnostic operations.

Example usage:
```ts
import { update as resourceUpdate } from '`@molecule/api-resource`'
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

#### `types`

#### `utilities`

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-locales-resource` ^1.0.0
- `@molecule/api-utilities-validation` ^1.0.0

## Translations

Translation strings are provided by `@molecule/api-locales-resource`.
