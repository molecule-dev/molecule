import http from 'node:http'
import https from 'node:https'
import process from 'node:process'

import express from 'express'

import { logger } from '@molecule/api-logger'
import { bodyParser as bodyParserMiddleware } from '@molecule/api-middleware-body-parser'
import { cookieParser as cookieParserMiddleware } from '@molecule/api-middleware-cookie-parser'
import { cors as corsMiddleware } from '@molecule/api-middleware-cors'
import { buildConfigReport, logConfigReport } from '@molecule/api-secrets'

/** A deliberately-tagged molecule error mapped to a real HTTP status by the API. */
export interface TaggedError {
  /** HTTP status to return (e.g. 503 for a missing provider config). */
  statusCode: number
  /** Machine-readable key the app/IDE maps to a friendly message. */
  errorKey: string
  /** Human-readable message. */
  message: string
}

/**
 * Classify a thrown value for the API error middleware. Returns a {@link TaggedError}
 * ONLY for values deliberately tagged by molecule with BOTH a numeric `statusCode`
 * AND a string `errorKey` — e.g. a provider's config-missing throw (`statusCode: 503`,
 * `errorKey: 'config.notConfigured'`). These are expected, actionable conditions a
 * user must resolve (a missing `STRIPE_SECRET_KEY` is theirs to set, not a server bug),
 * so the middleware surfaces the real status + errorKey instead of an opaque 500 — the
 * app/IDE can then show "configure X to enable this feature".
 *
 * Requiring BOTH fields is deliberate: it keeps arbitrary library errors that merely
 * carry a `.statusCode` (e.g. an AWS SDK error) from being silently surfaced with a
 * status molecule never chose. Returns `null` for everything else (→ default 500 path).
 *
 * @param error - The thrown value caught by the error middleware.
 * @returns The classified tagged error, or `null` if it isn't a molecule-tagged error.
 */
export function classifyTaggedError(error: unknown): TaggedError | null {
  if (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { statusCode?: unknown }).statusCode === 'number' &&
    typeof (error as { errorKey?: unknown }).errorKey === 'string'
  ) {
    const e = error as { statusCode: number; errorKey: string; message?: unknown }
    return {
      statusCode: e.statusCode,
      errorKey: e.errorKey,
      message: typeof e.message === 'string' ? e.message : 'Error',
    }
  }
  return null
}

/**
 * Terminal Express error middleware for the canonical molecule fleet server.
 *
 * Resolves a thrown value to exactly one of three sanitized responses and NEVER
 * delegates to Express's built-in `finalhandler`:
 *
 * 1. Bare-string `Unauthorized` / `Unauthorized.` → `401` with the string body
 *    (so authSelf-style middleware routes to 401 instead of a 500 page).
 * 2. A deliberately-tagged molecule error ({@link classifyTaggedError}) → its real
 *    `statusCode` + `{ error, errorKey }` JSON (expected, user-actionable config
 *    conditions, e.g. a missing `STRIPE_SECRET_KEY` → 503 `config.notConfigured`).
 * 3. EVERYTHING else (untagged library throws, null derefs, driver errors) → a
 *    generic `500 { error: 'Internal Server Error' }`, logged server-side.
 *
 * Case 3 is the security-critical branch: it is safe-by-construction and does NOT
 * depend on `NODE_ENV`. Calling `next(error)` here would fall through to Express's
 * `finalhandler`, which embeds `err.stack` in the HTTP response body whenever
 * `app.get('env') !== 'production'` (the default when `NODE_ENV` is unset or
 * `development`), disclosing absolute server paths, module layout, dependency
 * versions, and query/data fragments. Returning the opaque 500 unconditionally
 * removes that leak for every flagship app regardless of how it is deployed.
 *
 * @param error - The thrown value caught by Express.
 * @param _req - The request (unused).
 * @param res - The response to write the sanitized error to.
 * @param _next - The next function (intentionally never called for untagged errors).
 */
export const errorMiddleware: express.ErrorRequestHandler = (error, _req, res, _next) => {
  // Match both the bare `Unauthorized` string and the i18n-resolved
  // `Unauthorized.` (with trailing period from the resource locale
  // bond) so authSelf-style middleware reliably routes to 401 instead
  // of the default Express 500 error page.
  if (typeof error === 'string' && /^Unauthorized\.?$/.test(error)) {
    if (!res.headersSent) {
      res.status(401)
      res.send(error)
    }
    return
  }
  // Deliberately-tagged molecule errors (e.g. a provider config-missing throw:
  // 503 + 'config.notConfigured') are expected, user-actionable conditions — not
  // internal bugs. Surface the real status + errorKey so the app/IDE can render a
  // clean "configure X to enable this feature" instead of an opaque 500.
  const tagged = classifyTaggedError(error)
  if (tagged) {
    // 5xx here means a dependency/config isn't ready, not a server fault — warn,
    // don't error (an error-level log would falsely read as an app defect).
    if (tagged.statusCode >= 500) {
      logger.warn(tagged.message, { errorKey: tagged.errorKey })
    }
    if (!res.headersSent) {
      res.status(tagged.statusCode).json({ error: tagged.message, errorKey: tagged.errorKey })
    }
    return
  }
  // Untagged error: a real internal fault. Log the full detail SERVER-SIDE only,
  // then respond with a generic 500. We deliberately do NOT call `next(error)` —
  // that would hand control to Express's finalhandler, which leaks `err.stack`
  // into the response body unless NODE_ENV is exactly 'production'. Safe-by-
  // construction: no stack, no paths, no NODE_ENV dependency.
  logger.error(error)
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

/** Options for `createServerFactory`. */
export interface CreateServerOptions {
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

/**
 * Generic server-lifecycle hooks invoked with the real HTTP(S) server once it
 * has been created in `createServerFactory`, before it starts listening. Lets a
 * bond that must bind to the HTTP server itself — e.g. a Socket.IO realtime
 * provider sharing the API's port at `/socket.io/` — attach at the right moment,
 * without the factory hardcoding any specific bond. Drained (run once then
 * cleared) per `create()` so repeat calls (tests) don't accumulate stale hooks.
 */
const serverCreatedHooks: Array<(server: http.Server | https.Server) => void | Promise<void>> = []

/**
 * Register a hook to run with the HTTP(S) server right before it listens.
 * Typically called from a bond's setup (e.g. `setupRealtimeSocketio`) during
 * `setupBonds()`, which runs earlier in `create()` than server construction.
 *
 * @param hook - Receives the real `http.Server`/`https.Server`.
 */
export function registerServerCreatedHook(
  hook: (server: http.Server | https.Server) => void | Promise<void>,
): void {
  serverCreatedHooks.push(hook)
}

/**
 * Run and drain all registered server-created hooks.
 *
 * @param server - The HTTP(S) server to hand to each hook.
 */
async function runServerCreatedHooks(server: http.Server | https.Server): Promise<void> {
  const hooks = serverCreatedHooks.splice(0)
  for (const hook of hooks) await hook(server)
}

/**
 * Global browser-security headers applied to EVERY response (mounted before the
 * routers in `createServerFactory`, mirroring the molecule.dev platform server).
 *
 * Defaults are conservative and framework-agnostic — no app-specific CSP source
 * lists, just the clickjacking / MIME-sniffing / referrer baseline a JSON API
 * should always ship:
 *
 * - `X-Content-Type-Options: nosniff` — stop MIME-type sniffing.
 * - `X-Frame-Options: DENY` + `Content-Security-Policy: frame-ancestors 'none'`
 *   — anti-clickjacking. A generated app that intends to be embedded (iframe)
 *   can override these in its own middleware.
 * - `X-XSS-Protection: 0` — disable the legacy, buggy XSS auditor (modern
 *   correct value; CSP is the real defense).
 * - `Referrer-Policy: strict-origin-when-cross-origin` — don't leak full URLs
 *   cross-origin.
 * - `Strict-Transport-Security` — production only (mirrors the platform server's
 *   `NODE_ENV` check) so local plain-HTTP dev isn't force-upgraded to HTTPS.
 *
 * @param _req - The request (unused).
 * @param res - The response to set headers on.
 * @param next - Express next.
 */
export const securityHeadersMiddleware: express.RequestHandler = (_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '0')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Content-Security-Policy', "frame-ancestors 'none'")
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }
  next()
}

let processHandlersRegistered = false

/**
 * Returns an Express server-creation function bound to the given
 * setupBonds / runMigrations / router loaders. The returned `create`
 * builds the canonical molecule fleet server:
 *
 * - Migrations run first, then bonds, then router import.
 * - Global browser-security headers ({@link securityHeadersMiddleware})
 *   applied before any router (anti-clickjacking + nosniff + referrer baseline).
 * - `bodyParser` / `cookieParser` / `cors` middleware applied.
 * - Router mounted at `/api`.
 * - `/health` endpoint with `{ status: 'ok', timestamp }`.
 * - Bare-string `Unauthorized` / `Unauthorized.` errors normalized to 401.
 * - HTTPS in dev if `process.env.HTTPS` is set, using self-signed
 *   certs from optional dependency `pem`.
 * - `process.on('uncaughtException')` + `unhandledRejection` registered
 *   on first call (idempotent across multiple `create()` invocations).
 */
export function createServerFactory(
  opts: CreateServerOptions,
): (port?: number) => Promise<express.Express | https.Server> {
  return async (
    port: number = Number(process.env.PORT) || 4000,
  ): Promise<express.Express | https.Server> => {
    if (!processHandlersRegistered) {
      processHandlersRegistered = true
      process.on('uncaughtException', (error) => logger.error(error))
      process.on('unhandledRejection', (error) => logger.error(error))
    }

    await opts.runMigrations()
    await opts.setupBonds()
    if (opts.postBondsSetup) await opts.postBondsSetup()

    // Import router after bonds are set up — handler maps are built at
    // module-evaluation time, so bond-conditional handlers need providers
    // registered first.
    const { router } = await opts.getRouter()

    const app = express()
    app.disable('x-powered-by')

    // Browser-security headers on every response — mounted before any router so
    // /api, /health and error responses all carry them (mirrors the platform
    // server). Anti-clickjacking + nosniff + referrer baseline; HSTS in prod only.
    app.use(securityHeadersMiddleware)

    if (opts.preBodyParser) {
      // Custom-ordering path: mount cors+cookie before custom hooks
      // (e.g. multipart uploads) which run BEFORE the body parser
      // would otherwise swallow their streams.
      app.use(corsMiddleware)
      app.use(cookieParserMiddleware)
      await opts.preBodyParser(app)
      app.use(bodyParserMiddleware)
    } else {
      // Canonical ordering — body/cookie/cors stacked in that order.
      app.use(bodyParserMiddleware)
      app.use(cookieParserMiddleware)
      app.use(corsMiddleware)
    }

    if (opts.preApiRouter) await opts.preApiRouter(app)

    app.use('/api', router)

    app.get('/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() })
    })

    // Terminal sanitizing error handler — safe-by-construction. Untagged errors
    // get a generic 500 here and never reach Express's stack-leaking finalhandler.
    app.use(errorMiddleware)

    let server: express.Express | https.Server = app
    if (process.env.HTTPS) {
      // Self-signed cert for local HTTPS dev. `pem` is an optional dep.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pem = require('pem') as {
        createCertificate(
          options: { days: number; selfSigned: boolean },
          callback: (
            error: Error | null,
            keys: { serviceKey: string; certificate: string },
          ) => void,
        ): void
      }
      server = await new Promise<https.Server>((resolve, reject) => {
        pem.createCertificate({ days: 1, selfSigned: true }, (error, keys) => {
          if (error) reject(error)
          else resolve(https.createServer({ key: keys.serviceKey, cert: keys.certificate }, app))
        })
      })
    }

    // The real HTTP(S) server that lifecycle-coupled bonds (e.g. a Socket.IO
    // realtime provider) must bind to. In HTTP mode `server` is the Express app,
    // whose underlying http.Server is otherwise created+discarded by
    // `app.listen()`; create it explicitly so server-created hooks attach to the
    // SAME server the API listens on (Socket.IO then serves `/socket.io/` on the
    // API port). Hooks run before `listen()` so the upgrade handler is ready.
    const httpServer: http.Server | https.Server = process.env.HTTPS
      ? (server as https.Server)
      : http.createServer(app)
    await runServerCreatedHooks(httpServer)
    httpServer.listen(port, () => {
      logger.info(
        `Started ${process.env.NODE_ENV} ${process.env.HTTPS ? 'HTTPS' : 'HTTP'} server on port ${port}.`,
      )
      // Boot-time configuration report: bonds self-register their secret
      // definitions at import; log which are configured vs missing (each
      // missing REQUIRED key warns with its description + setup URL) so a
      // degraded integration is loud and actionable at startup — instead of
      // surfacing later as a lazy 503 on the first request that needs it.
      // Fire-and-forget: reporting must never delay or fail the boot.
      buildConfigReport()
        .then(logConfigReport)
        .catch((error: unknown) => {
          logger.debug('boot config report failed', { error })
        })
    })

    return server
  }
}
