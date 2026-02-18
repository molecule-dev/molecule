# @molecule/api-middleware-cookie-parser

Cookie parser middleware for molecule.dev.

Core interface — the actual implementation is provided via bonds.
Install a cookie parser bond (e.g., `@molecule/api-middleware-cookie-parser-express`)
to provide cookie parsing.

## Type
`middleware`

## Installation
```bash
npm install @molecule/api-middleware-cookie-parser
```

## API

### Interfaces

#### `CookieParseOptions`

Options for cookie parsing.

```typescript
interface CookieParseOptions {
  decode?: (value: string) => string
}
```

### Types

#### `CookieParserFactory`

Factory function type for creating cookie parser middleware with secret and options.

```typescript
type CookieParserFactory = (
  secret?: string | string[],
  options?: CookieParseOptions,
) => Middleware
```

#### `Middleware`

Generic middleware type — framework-agnostic.

```typescript
type Middleware = (req: unknown, res: unknown, next: (err?: unknown) => void) => void
```

### Functions

#### `cookieParser(req, res, next)`

Default cookie parser middleware that delegates to the bonded implementation. Parses the Cookie header and populates `req.cookies`.

```typescript
function cookieParser(req: unknown, res: unknown, next: (err?: unknown) => void): void
```

- `req` — The incoming request object.
- `res` — The response object.
- `next` — The next middleware function.

**Returns:** The result of the bonded cookie parser invocation.

#### `createCookieParserMiddleware(secret, options)`

Creates cookie parser middleware with custom options via the bonded factory.

```typescript
function createCookieParserMiddleware(secret?: string | string[], options?: CookieParseOptions): Middleware
```

- `secret` — Secret string(s) for signed cookie verification.
- `options` — Cookie parsing options (e.g., custom decode function).

**Returns:** A middleware function that parses cookies.

#### `getCookieParser()`

Gets the bonded cookie parser middleware.

```typescript
function getCookieParser(): Middleware
```

**Returns:** The bonded cookie parser middleware function.

#### `getCookieParserFactory()`

Gets the bonded cookie parser factory.

```typescript
function getCookieParserFactory(): CookieParserFactory | null
```

**Returns:** The factory function, or `null` if none has been bonded.

#### `hasCookieParser()`

Checks if a cookie parser middleware has been bonded.

```typescript
function hasCookieParser(): boolean
```

**Returns:** `true` if a cookie parser is available.

#### `setCookieParser(parser)`

Bonds a cookie parser middleware implementation for use by `getCookieParser()` and `cookieParser`.

```typescript
function setCookieParser(parser: Middleware): void
```

- `parser` — The middleware function that parses cookies.

#### `setCookieParserFactory(factory)`

Bonds a cookie parser factory for creating parsers with custom secrets and options.

```typescript
function setCookieParserFactory(factory: CookieParserFactory): void
```

- `factory` — A function that creates cookie parser middleware from options.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
