# @molecule/api-middleware-body-parser

Body parser middleware for molecule.dev.

Core interface — the actual implementation is provided via bonds.
Install a body parser bond (e.g., `@molecule/api-middleware-body-parser-express`)
to provide JSON and multipart form data parsing.

## Type
`middleware`

## Installation
```bash
npm install @molecule/api-middleware-body-parser
```

## API

### Interfaces

#### `JsonParserOptions`

Options for JSON body parsing (limit, strict mode, content type).

```typescript
interface JsonParserOptions {
  limit?: string | number
  strict?: boolean
  type?: string | string[]
}
```

### Types

#### `JsonParserFactory`

Factory function type for creating JSON parsers with options.

```typescript
type JsonParserFactory = (options?: JsonParserOptions) => Middleware
```

#### `Middleware`

Generic middleware type — framework-agnostic.

```typescript
type Middleware = (req: unknown, res: unknown, next: (err?: unknown) => void) => void
```

### Functions

#### `bodyParser(req, res, next)`

Default body parser middleware that delegates to the bonded implementation.

```typescript
function bodyParser(req: unknown, res: unknown, next: (err?: unknown) => void): void
```

- `req` — The incoming request object.
- `res` — The response object.
- `next` — The next middleware function.

**Returns:** The result of the bonded body parser invocation.

#### `createJsonParser(options)`

Creates a JSON body parser with custom options via the bonded factory.

```typescript
function createJsonParser(options?: JsonParserOptions): Middleware
```

- `options` — JSON parsing options (limit, strict mode, content type).

**Returns:** A middleware function that parses JSON request bodies.

#### `getBodyParser()`

Gets the bonded body parser middleware.

```typescript
function getBodyParser(): Middleware
```

**Returns:** The bonded body parser middleware function.

#### `getJsonParserFactory()`

Gets the bonded JSON parser factory.

```typescript
function getJsonParserFactory(): JsonParserFactory | null
```

**Returns:** The factory function, or `null` if none has been bonded.

#### `hasBodyParser()`

Checks if a body parser middleware has been bonded.

```typescript
function hasBodyParser(): boolean
```

**Returns:** `true` if a body parser is available.

#### `setBodyParser(parser)`

Bonds a body parser middleware implementation for use by `getBodyParser()` and `bodyParser`.

```typescript
function setBodyParser(parser: Middleware): void
```

- `parser` — The middleware function that parses request bodies.

#### `setJsonParserFactory(factory)`

Bonds a JSON parser factory for creating parsers with custom options (e.g., size limits).

```typescript
function setJsonParserFactory(factory: JsonParserFactory): void
```

- `factory` — A function that creates JSON parser middleware from options.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
