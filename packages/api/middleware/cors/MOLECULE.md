# @molecule/api-middleware-cors

CORS middleware for molecule.dev.

## Type
`middleware`

## Installation
```bash
npm install @molecule/api-middleware-cors
```

## API

### Interfaces

#### `CorsOptions`

CORS configuration options.

```typescript
interface CorsOptions {
  origin?:
    | string
    | string[]
    | boolean
    | RegExp
    | (string | RegExp | null | undefined)[]
    | ((origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void)
  methods?: string | string[]
  allowedHeaders?: string | string[]
  exposedHeaders?: string | string[]
  credentials?: boolean
  maxAge?: number
  preflightContinue?: boolean
  optionsSuccessStatus?: number
}
```

### Types

#### `CorsFactory`

Factory function type for creating CORS middleware with custom options.

```typescript
type CorsFactory = (options: CorsOptions) => Middleware
```

#### `Middleware`

Generic middleware type — framework-agnostic.

```typescript
type Middleware = (req: unknown, res: unknown, next: (err?: unknown) => void) => void
```

### Functions

#### `cors(req, res, next)`

Default CORS middleware that delegates to the bonded implementation.

```typescript
function cors(req: unknown, res: unknown, next: (err?: unknown) => void): void
```

- `req` — The incoming request object.
- `res` — The response object.
- `next` — The next middleware function.

**Returns:** The result of the bonded CORS handler invocation.

#### `createCorsMiddleware(options)`

Creates CORS middleware with custom options via the bonded factory.

```typescript
function createCorsMiddleware(options: CorsOptions): Middleware
```

- `options` — CORS options (origins, methods, headers, credentials, etc.).

**Returns:** A middleware function that handles CORS headers.

#### `getCors()`

Gets the bonded CORS middleware.

```typescript
function getCors(): Middleware
```

**Returns:** The bonded CORS middleware function.

#### `getCorsFactory()`

Gets the bonded CORS factory.

```typescript
function getCorsFactory(): CorsFactory | null
```

**Returns:** The factory function, or `null` if none has been bonded.

#### `hasCors()`

Checks if a CORS middleware has been bonded.

```typescript
function hasCors(): boolean
```

**Returns:** `true` if CORS middleware is available.

#### `setCors(middleware)`

Bonds a CORS middleware implementation for use by `getCors()` and `cors`.

```typescript
function setCors(middleware: Middleware): void
```

- `middleware` — The middleware function that handles CORS headers.

#### `setCorsFactory(factory)`

Bonds a CORS factory for creating middleware with custom options (origins, methods, headers).

```typescript
function setCorsFactory(factory: CorsFactory): void
```

- `factory` — A function that creates CORS middleware from options.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-secrets` ^1.0.0
