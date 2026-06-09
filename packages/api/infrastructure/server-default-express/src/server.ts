import http from 'node:http'
import https from 'node:https'
import process from 'node:process'

import express from 'express'

import { logger } from '@molecule/api-logger'
import { bodyParser as bodyParserMiddleware } from '@molecule/api-middleware-body-parser'
import { cookieParser as cookieParserMiddleware } from '@molecule/api-middleware-cookie-parser'
import { cors as corsMiddleware } from '@molecule/api-middleware-cors'

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

let processHandlersRegistered = false

/**
 * Returns an Express server-creation function bound to the given
 * setupBonds / runMigrations / router loaders. The returned `create`
 * builds the canonical molecule fleet server:
 *
 * - Migrations run first, then bonds, then router import.
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

    app.use(((error, _req, res, next) => {
      // Match both the bare `Unauthorized` string and the i18n-resolved
      // `Unauthorized.` (with trailing period from the resource locale
      // bond) so authSelf-style middleware reliably routes to 401 instead
      // of the default Express 500 error page.
      if (typeof error === 'string' && /^Unauthorized\.?$/.test(error)) {
        res.status(401)
        res.send(error)
        return
      }
      logger.error(error)
      return next(error)
    }) as express.ErrorRequestHandler)

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
    })

    return server
  }
}
