# @molecule/api-middleware-cookie-parser-express

Express cookie parser provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-middleware-cookie-parser-express
```

## Usage

```typescript
import { setCookieParser, setCookieParserFactory } from '@molecule/api-middleware-cookie-parser'
import { provider, cookieParserFactory } from '@molecule/api-middleware-cookie-parser-express'

setCookieParser(provider)
setCookieParserFactory(cookieParserFactory)
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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-middleware-cookie-parser` ^1.0.0
