# @molecule/api-middleware-validation

Request validation middleware for molecule API packages.
Uses Zod schemas to validate request body, params, and query.

## Quick Start

```typescript
import { validate, validateBody, paginationSchema } from '@molecule/api-middleware-validation'
import { z } from 'zod'

const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  tags: z.array(z.string()).optional(),
})

router.post('/posts', validateBody(createPostSchema), createPost)
router.get('/posts', validate({ query: paginationSchema }), listPosts)
```

## Type
`utility`

## Installation
```bash
npm install @molecule/api-middleware-validation @molecule/api-bond @molecule/api-i18n zod
```

## API

### Interfaces

#### `PaginatedResponse`

Shape of a paginated list response.

```typescript
interface PaginatedResponse<T> {
  /** The page of results. */
  data: T[]
  /** Pagination metadata. */
  pagination: {
    /** Current page number. */
    page: number
    /** Items per page. */
    perPage: number
    /** Total number of items across all pages. */
    total: number
    /** Total number of pages. */
    totalPages: number
    /** Whether more pages exist after the current one. */
    hasMore: boolean
  }
}
```

#### `ValidationError`

A single validation error describing which field failed and why.

```typescript
interface ValidationError {
  /** Dot-delimited path to the invalid field (e.g. `"address.city"`). */
  field: string
  /** Human-readable error message. */
  message: string
  /** Zod issue code (e.g. `"invalid_type"`, `"too_small"`). */
  code: string
}
```

#### `ValidationResult`

The result of validating a request against a schema.

```typescript
interface ValidationResult {
  /** Whether validation passed without errors. */
  success: boolean
  /** Array of validation errors (empty when `success` is `true`). */
  errors: ValidationError[]
}
```

### Types

#### `PaginationQuery`

Inferred type for pagination query parameters.

```typescript
type PaginationQuery = z.infer<typeof paginationSchema>
```

#### `SearchQuery`

Inferred type for search query parameters (pagination + search term).

```typescript
type SearchQuery = z.infer<typeof searchQuerySchema>
```

#### `ValidationSchema`

Schema definition for validating different parts of a request.
Each key maps to a Zod schema that validates the corresponding request property.

```typescript
type ValidationSchema = {
  /** Schema for validating the request body. */
  body?: ZodType
  /** Schema for validating URL params. */
  params?: ZodType
  /** Schema for validating query string parameters. */
  query?: ZodType
}
```

### Functions

#### `error(message, errors)`

Creates a standard error response object.

```typescript
function error(message: string, errors?: { field: string; message: string; }[]): { error: string; errors?: Array<{ field: string; message: string; }>; }
```

- `message` — Top-level error message.
- `errors` — Optional array of field-level errors.

**Returns:** An error response object.

#### `paginated(data, total, page, perPage)`

Wraps a list of items with pagination metadata.

```typescript
function paginated(data: T[], total: number, page: number, perPage: number): PaginatedResponse<T>
```

- `data` — The items for the current page.
- `total` — Total item count across all pages.
- `page` — Current page number (1-based).
- `perPage` — Number of items per page.

**Returns:** A `PaginatedResponse` object.

#### `success(data)`

Wraps a value in a standard `{ data }` envelope.

```typescript
function success(data: T): { data: T; }
```

- `data` — The payload to wrap.

**Returns:** An object with a single `data` key.

#### `validate(schema)`

Creates an Express middleware that validates the request body, params,
and/or query against the provided Zod schemas.

On success the parsed (and possibly coerced/defaulted) values replace the
original request properties and `next()` is called.

On failure a `400` JSON response is returned with structured error details.

```typescript
function validate(schema: ValidationSchema): RequestHandler<ParamsDictionary, any, any, ParsedQs, Record<string, any>>
```

- `schema` — Object mapping request parts (`body`, `params`, `query`) to Zod schemas.

**Returns:** Express middleware function.

#### `validateBody(schema)`

Convenience wrapper that validates only the request body.

```typescript
function validateBody(schema: T): RequestHandler<ParamsDictionary, any, any, ParsedQs, Record<string, any>>
```

- `schema` — Zod schema for `req.body`.

**Returns:** Express middleware function.

#### `validateParams(schema)`

Convenience wrapper that validates only URL params.

```typescript
function validateParams(schema: T): RequestHandler<ParamsDictionary, any, any, ParsedQs, Record<string, any>>
```

- `schema` — Zod schema for `req.params`.

**Returns:** Express middleware function.

#### `validateQuery(schema)`

Convenience wrapper that validates only query string parameters.

```typescript
function validateQuery(schema: T): RequestHandler<ParamsDictionary, any, any, ParsedQs, Record<string, any>>
```

- `schema` — Zod schema for `req.query`.

**Returns:** Express middleware function.

### Constants

#### `idParamSchema`

Schema for a single UUID `id` URL parameter.

```typescript
const idParamSchema: z.ZodObject<{ id: z.ZodUUID; }, z.core.$strip>
```

#### `paginationSchema`

Schema for standard pagination query parameters.

Coerces string values to numbers (as query params arrive as strings).

```typescript
const paginationSchema: z.ZodObject<{ page: z.ZodDefault<z.ZodCoercedNumber<unknown>>; perPage: z.ZodDefault<z.ZodCoercedNumber<unknown>>; sort: z.ZodOptional<z.ZodString>; order: z.ZodDefault<z.ZodEnum<{ asc: "asc"; desc: "desc"; }>>; }, z.core.$strip>
```

#### `searchQuerySchema`

Schema that extends pagination with an optional search query `q`.

```typescript
const searchQuerySchema: z.ZodObject<{ page: z.ZodDefault<z.ZodCoercedNumber<unknown>>; perPage: z.ZodDefault<z.ZodCoercedNumber<unknown>>; sort: z.ZodOptional<z.ZodString>; order: z.ZodDefault<z.ZodEnum<{ asc: "asc"; desc: "desc"; }>>; q: z.ZodOptional<z.ZodString>; }, z.core.$strip>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-i18n`
- `zod`

Express/Connect middleware (Express 4 and 5 — including the Express 5
getter-only `req.query`, which is handled internally). For other
frameworks, call the schemas directly and shape your own 400 response.
On success the parsed values REPLACE `req.body` / `req.params` /
`req.query`, so Zod coercions and defaults are what handlers see. On
failure the response is `400 { error, errors: [{ field, message, code }] }`.

Sibling: `@molecule/api-utilities-validation` is the PROGRAMMATIC helper
set (`getValidProps`, `safeParse`) for use inside handlers/services — both
packages export a `validate`, so alias if you import both.
