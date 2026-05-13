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

    server.listen(port, () => {
      logger.info(
        `Started ${process.env.NODE_ENV} ${process.env.HTTPS ? 'HTTPS' : 'HTTP'} server on port ${port}.`,
      )
    })

    return server
  }
}
