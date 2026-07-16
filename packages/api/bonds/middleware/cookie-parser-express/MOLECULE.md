# @molecule/api-middleware-cookie-parser-express

Express cookie parser provider for molecule.dev.

## Quick Start

```typescript
import { setCookieParser, setCookieParserFactory } from '@molecule/api-middleware-cookie-parser'
import { provider, cookieParserFactory } from '@molecule/api-middleware-cookie-parser-express'

setCookieParser(provider)
setCookieParserFactory(cookieParserFactory)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-middleware-cookie-parser-express @molecule/api-middleware-cookie-parser cookie-parser
npm install -D @types/cookie-parser
```

## API

### Functions

#### `cookieParserFactory(secret, options)`

Factory for creating cookie parser middleware with a signing secret and custom options.

```typescript
function cookieParserFactory(secret?: string | string[], options?: CookieParseOptions): Middleware
```

- `secret` — A string or array of strings used to sign/unsign cookies. If provided, signed cookies are available on `req.signedCookies`.
- `options` — Options passed to the `cookie-parser` package (e.g. `decode` function).

**Returns:** A `Middleware` that parses cookies with the specified secret and options.

### Constants

#### `provider`

The Express cookie parser provider.

Parses Cookie header and populates `req.cookies` with an object
keyed by the cookie names.

```typescript
const provider: Middleware
```

## Core Interface
Implements `@molecule/api-middleware-cookie-parser` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setCookieParserFactory } from '@molecule/api-middleware-cookie-parser'
import { cookieParserFactory } from '@molecule/api-middleware-cookie-parser-express'

export function setupMiddlewareCookieParserExpress(): void {
  setCookieParserFactory(cookieParserFactory)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-middleware-cookie-parser` ^1.0.0

### Runtime Dependencies

- `@molecule/api-middleware-cookie-parser`
- `cookie-parser`

- **Wire BOTH setters** (as in the example) — wiring only the factory leaves
  the core `cookieParser` middleware throwing "not configured".
- The default `provider` parses UNSIGNED cookies into `req.cookies` only.
  For signed cookies, register `cookieParserFactory` and create the
  middleware with a secret — verified values then land on
  `req.signedCookies` (tampered ones become `false`), while unsigned
  cookies remain on `req.cookies`.
