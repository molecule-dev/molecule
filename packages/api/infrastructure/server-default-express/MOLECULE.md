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

#### `TaggedError`

A deliberately-tagged molecule error mapped to a real HTTP status by the API.

```typescript
interface TaggedError {
  /** HTTP status to return (e.g. 503 for a missing provider config). */
  statusCode: number
  /** Machine-readable key the app/IDE maps to a friendly message. */
  errorKey: string
  /** Human-readable message. */
  message: string
}
```

### Functions

#### `classifyTaggedError(error)`

Classify a thrown value for the API error middleware. Returns a {@link TaggedError}
ONLY for values deliberately tagged by molecule with BOTH a numeric `statusCode`
AND a string `errorKey` — e.g. a provider's config-missing throw (`statusCode: 503`,
`errorKey: 'config.notConfigured'`). These are expected, actionable conditions a
user must resolve (a missing `STRIPE_SECRET_KEY` is theirs to set, not a server bug),
so the middleware surfaces the real status + errorKey instead of an opaque 500 — the
app/IDE can then show "configure X to enable this feature".

Requiring BOTH fields is deliberate: it keeps arbitrary library errors that merely
carry a `.statusCode` (e.g. an AWS SDK error) from being silently surfaced with a
status molecule never chose. Returns `null` for everything else (→ default 500 path).

```typescript
function classifyTaggedError(error: unknown): TaggedError | null
```

- `error` — The thrown value caught by the error middleware.

**Returns:** The classified tagged error, or `null` if it isn't a molecule-tagged error.

#### `createServerFactory(opts)`

Returns an Express server-creation function bound to the given
setupBonds / runMigrations / router loaders. The returned `create`
builds the canonical molecule fleet server:

- Migrations run first, then bonds, then router import.
- Global browser-security headers ({@link securityHeadersMiddleware})
  applied before any router (anti-clickjacking + nosniff + referrer baseline).
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

#### `errorMiddleware(error, _req, res, _next)`

Terminal Express error middleware for the canonical molecule fleet server.

Resolves a thrown value to exactly one of three sanitized responses and NEVER
delegates to Express's built-in `finalhandler`:

1. Bare-string `Unauthorized` / `Unauthorized.` → `401` with the string body
   (so authSelf-style middleware routes to 401 instead of a 500 page).
2. A deliberately-tagged molecule error ({@link classifyTaggedError}) → its real
   `statusCode` + `{ error, errorKey }` JSON (expected, user-actionable config
   conditions, e.g. a missing `STRIPE_SECRET_KEY` → 503 `config.notConfigured`).
3. EVERYTHING else (untagged library throws, null derefs, driver errors) → a
   generic `500 { error: 'Internal Server Error' }`, logged server-side.

Case 3 is the security-critical branch: it is safe-by-construction and does NOT
depend on `NODE_ENV`. Calling `next(error)` here would fall through to Express's
`finalhandler`, which embeds `err.stack` in the HTTP response body whenever
`app.get('env') !== 'production'` (the default when `NODE_ENV` is unset or
`development`), disclosing absolute server paths, module layout, dependency
versions, and query/data fragments. Returning the opaque 500 unconditionally
removes that leak for every flagship app regardless of how it is deployed.

```typescript
function errorMiddleware(error: any, _req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>, res: Response<any, Record<string, any>, number>, _next: NextFunction): void
```

- `error` — The thrown value caught by Express.
- `_req` — The request (unused).
- `res` — The response to write the sanitized error to.
- `_next` — The next function (intentionally never called for untagged errors).

#### `registerServerCreatedHook(hook)`

Register a hook to run with the HTTP(S) server right before it listens.
Typically called from a bond's setup (e.g. `setupRealtimeSocketio`) during
`setupBonds()`, which runs earlier in `create()` than server construction.

```typescript
function registerServerCreatedHook(hook: (server: http.Server | https.Server) => void | Promise<void>): void
```

- `hook` — Receives the real `http.Server`/`https.Server`.

#### `securityHeadersMiddleware(_req, res, next)`

Global browser-security headers applied to EVERY response (mounted before the
routers in `createServerFactory`, mirroring the molecule.dev platform server).

Defaults are conservative and framework-agnostic — no app-specific CSP source
lists, just the clickjacking / MIME-sniffing / referrer baseline a JSON API
should always ship:

- `X-Content-Type-Options: nosniff` — stop MIME-type sniffing.
- `X-Frame-Options: DENY` + `Content-Security-Policy: frame-ancestors 'none'`
  — anti-clickjacking. A generated app that intends to be embedded (iframe)
  can override these in its own middleware.
- `X-XSS-Protection: 0` — disable the legacy, buggy XSS auditor (modern
  correct value; CSP is the real defense).
- `Referrer-Policy: strict-origin-when-cross-origin` — don't leak full URLs
  cross-origin.
- `Strict-Transport-Security` — production only (mirrors the platform server's
  `NODE_ENV` check) so local plain-HTTP dev isn't force-upgraded to HTTPS.

```typescript
function securityHeadersMiddleware(_req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>, res: Response<any, Record<string, any>, number>, next: NextFunction): void
```

- `_req` — The request (unused).
- `res` — The response to set headers on.
- `next` — Express next.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-middleware-body-parser` ^1.0.0
- `@molecule/api-middleware-cookie-parser` ^1.0.0
- `@molecule/api-middleware-cors` ^1.0.0
- `@molecule/api-secrets` ^1.0.0
- `express` ^4.0.0 || ^5.0.0
