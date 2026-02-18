# @molecule/api-middleware-cors-express

Express CORS provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-middleware-cors-express
```

## Usage

```typescript
import { setCors, setCorsFactory } from '@molecule/api-middleware-cors'
import { provider, corsFactory } from '@molecule/api-middleware-cors-express'

setCors(provider)
setCorsFactory(corsFactory)
```

## API

### Functions

#### `corsFactory(options)`

Factory for creating CORS middleware with fully custom options, bypassing the default origin list.

```typescript
function corsFactory(options: CorsOptions): Middleware
```

- `options` — CORS configuration passed directly to the `cors` package.

**Returns:** A `Middleware` that applies the specified CORS policy.

#### `provider(req, res, next)`

CORS middleware provider that delegates to the lazily-initialized `cors` handler.
Allows requests from `APP_ORIGIN`, `SITE_ORIGIN`, localhost, and Capacitor/Electron schemes.

```typescript
function provider(req: unknown, res: unknown, next: (err?: unknown) => void): void
```

- `req` — The incoming request object.
- `res` — The response object.
- `next` — The next middleware function.

**Returns:** The result of the CORS handler invocation.

## Core Interface
Implements `@molecule/api-middleware-cors` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-middleware-cors` ^1.0.0
