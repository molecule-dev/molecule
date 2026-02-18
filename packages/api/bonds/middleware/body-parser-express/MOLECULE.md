# @molecule/api-middleware-body-parser-express

Express body parser provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-middleware-body-parser-express
```

## Usage

```typescript
import { setBodyParser, setJsonParserFactory } from '@molecule/api-middleware-body-parser'
import { provider, jsonParserFactory } from '@molecule/api-middleware-body-parser-express'

setBodyParser(provider)
setJsonParserFactory(jsonParserFactory)
```

## API

### Functions

#### `jsonParserFactory(options)`

Creates a JSON body parser middleware with custom options (e.g. custom `limit`, `type`, or `verify`).

```typescript
function jsonParserFactory(options?: JsonParserOptions): Middleware
```

- `options` — Express JSON parser options passed directly to `express.json()`.

**Returns:** A `Middleware` that parses JSON request bodies with the specified options.

#### `provider(req, res, next)`

Express body parser middleware provider.

Routes requests to the appropriate parser: `busboy` for multipart/form-data and
URL-encoded bodies, or Express's built-in JSON parser for everything else.
Sets `req.rawBody` for Stripe and similar libraries that need the unparsed body.

For file uploads, use `@molecule/utilities-files`.

```typescript
function provider(req: unknown, res: unknown, next: (err?: unknown) => void): void
```

- `req` — The incoming request object.
- `res` — The response object.
- `next` — The next middleware function.

## Core Interface
Implements `@molecule/api-middleware-body-parser` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-middleware-body-parser` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `express` ^5.0.0
