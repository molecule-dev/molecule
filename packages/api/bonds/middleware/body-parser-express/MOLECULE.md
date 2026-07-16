# @molecule/api-middleware-body-parser-express

Express body parser provider for molecule.dev.

## Quick Start

```typescript
import { setBodyParser, setJsonParserFactory } from '@molecule/api-middleware-body-parser'
import { provider, jsonParserFactory } from '@molecule/api-middleware-body-parser-express'

setBodyParser(provider)
setJsonParserFactory(jsonParserFactory)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-middleware-body-parser-express @molecule/api-bond @molecule/api-i18n @molecule/api-middleware-body-parser connect-busboy express
npm install -D @types/connect-busboy @types/express
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

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setJsonParserFactory } from '@molecule/api-middleware-body-parser'
import { jsonParserFactory } from '@molecule/api-middleware-body-parser-express'

export function setupMiddlewareBodyParserExpress(): void {
  setJsonParserFactory(jsonParserFactory)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-middleware-body-parser` ^1.0.0
- `express` ^5.0.0

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-i18n`
- `@molecule/api-middleware-body-parser`
- `connect-busboy`
- `express`

- **Wire BOTH setters** (as in the example): `setBodyParser(provider)`
  registers the parser the core `bodyParser` middleware delegates to —
  wiring only the factory leaves `getBodyParser()` throwing on the first
  request.
- JSON bodies are capped at **2 MB** (413 beyond it). For larger payloads
  create a custom parser via `setJsonParserFactory(jsonParserFactory)` +
  `createJsonParser({ limit: '10mb' })` from the core.
- `multipart/form-data` and `application/x-www-form-urlencoded` are parsed
  by busboy: **file parts are skipped** (streams drained — use
  `@molecule/utilities-files` for uploads), and **each field value is
  JSON-parsed when possible** (`"123"` → number `123`, `"true"` → `true`;
  invalid JSON stays a string). Cumulative field bytes are capped at 2 MB
  (413).
- `req.rawBody` (a STRING copy of the unparsed body, for Stripe-style
  webhook signature verification) is set only on the JSON path — multipart
  requests never get it.
