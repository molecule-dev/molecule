# @molecule/api-server-default-express

`@molecule/api-server-default-express` — drop-in Express server
factory used by the molecule fleet's `api/src/server.ts`.

`createServerFactory({ setupBonds, runMigrations, getRouter })`
returns a `(port?) => Promise<server>` function that runs
migrations, wires bonds, mounts router + middleware, and starts
an HTTP (or self-signed HTTPS for local dev) listener.

## Quick Start

```ts
import { fileURLToPath } from 'node:url'
import { createServerFactory } from '@molecule/api-server-default-express'

import { setupBonds } from './bonds/index.js'
import { runMigrations } from './scripts/migrate.js'

export const create = createServerFactory({
  setupBonds,
  runMigrations,
  getRouter: () => import('./App/router.js'),
})

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  create()
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/api-server-default-express
```

## API

### Interfaces

#### `CreateServerOptions`

Options for `createServerFactory`.

```typescript
interface CreateServerOptions {
  /** App-specific bond wiring (resolves secrets + wires providers). */
  setupBonds: () => Promise<void>
  /** DB migration runner (typically the `createMigrator()`-bound function). */
  runMigrations: () => Promise<void>
  /**
   * Lazy router import. Loaded AFTER `setupBonds()` so bond-conditional
   * route maps see fully-registered providers at module-evaluation time.
   */
  getRouter: () => Promise<{ router: express.Router }>
  /**
   * Optional hook to mount middleware AFTER cors+cookieParser but
   * BEFORE the body parser. Use this for routes that need their own
   * multipart streaming (file uploads via busboy) — the body parser's
   * `files: 0` config would silently consume the multipart stream.
   */
  preBodyParser?: (app: express.Express) => Promise<void> | void
  /**
   * Optional hook called after `setupBonds()` but before the router
   * import. Use for additional one-shot setup (e.g. entitlements
   * tier-registry registration that runs after the bonds are wired).
   */
  postBondsSetup?: () => Promise<void> | void
  /**
   * Optional hook to mount middleware on `/api` BEFORE the canonical
   * `app.use('/api', router)` mount. Use for app-specific authed
   * content handlers (`/api`-prefixed) that need to run before the
   * resource router.
   */
  preApiRouter?: (app: express.Express) => Promise<void> | void
}
```

### Functions

#### `createServerFactory(opts)`

Returns an Express server-creation function bound to the given
setupBonds / runMigrations / router loaders. The returned `create`
builds the canonical molecule fleet server:

- Migrations run first, then bonds, then router import.
- `bodyParser` / `cookieParser` / `cors` middleware applied.
- Router mounted at `/api`.
- `/health` endpoint with `{ status: 'ok', timestamp }`.
- Bare-string `Unauthorized` / `Unauthorized.` errors normalized to 401.
- HTTPS in dev if `process.env.HTTPS` is set, using self-signed
  certs from optional dependency `pem`.
- `process.on('uncaughtException')` + `unhandledRejection` registered
  on first call (idempotent across multiple `create()` invocations).

```typescript
function createServerFactory(opts: CreateServerOptions): (port?: number) => Promise<express.Express | https.Server>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-middleware-body-parser` ^1.0.0
- `@molecule/api-middleware-cookie-parser` ^1.0.0
- `@molecule/api-middleware-cors` ^1.0.0
- `express` ^4.0.0 || ^5.0.0
