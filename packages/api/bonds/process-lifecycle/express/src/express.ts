/**
 * Express integration for the process-lifecycle provider: request tracking,
 * `GET /health/live`, `GET /health/ready`, and the signal-driven shutdown.
 *
 * @module
 */

import type express from 'express'

import type { ProcessLifecycleProvider } from '@molecule/api-process-lifecycle'
import { setProvider } from '@molecule/api-process-lifecycle'

import { provider as defaultProvider } from './lifecycle.js'
import { installGracefulShutdown } from './shutdown.js'
import type {
  ClosableServer,
  ExpressLifecycleHandle,
  ExpressLifecycleOptions,
  LivenessResponse,
  ReadinessResponse,
} from './types.js'

/**
 * Set `Connection: close` on a response while the process is draining.
 *
 * Use handoff headers only on a response that refuses the request before any
 * application operation runs. A routing proxy may execute that request elsewhere.
 * This function never changes the HTTP status, body or readiness verdict.
 *
 * @param provider - The lifecycle provider that owns the drain state.
 * @param res - The response being prepared.
 * @param headers - Optional deployment-specific response headers for a refused request.
 */
export function applyDrainingResponseHeaders(
  provider: ProcessLifecycleProvider,
  res: express.Response,
  headers?: Readonly<Record<string, string>>,
): void {
  if (!provider.isDraining()) return
  for (const [name, value] of Object.entries(headers ?? {})) res.setHeader(name, value)
  res.setHeader('Connection', 'close')
}

/**
 * Mark responses to requests arriving while draining `Connection: close`.
 *
 * An application that keeps its own request counting (a server that predates
 * this package's middleware) mounts this instead of
 * {@link createLifecycleMiddleware}. State is checked at request entry. The
 * header tells the peer not to reuse this connection; routing withdrawal is
 * the load balancer's responsibility. Mount this before every route.
 *
 * @param provider - The lifecycle provider that owns the drain state.
 * @returns An Express request handler.
 *
 * @example
 * ```typescript
 * app.use(createDrainHeaderMiddleware(lifecycle))
 * ```
 */
export function createDrainHeaderMiddleware(
  provider: ProcessLifecycleProvider,
): express.RequestHandler {
  return (_req, res, next) => {
    applyDrainingResponseHeaders(provider, res)
    next()
  }
}

/**
 * Create the Express middleware that tracks in-flight requests.
 *
 * The middleware counts the request for the whole response lifetime
 * (`finish`/`close`), so a slow handler or an SSE stream is visible to the
 * drain. Requests arriving while draining get `Connection: close`, telling
 * the client (and any proxy reusing a keep-alive socket) not to send another
 * request on this connection.
 *
 * @param provider - The lifecycle provider that owns the counter and drain state.
 * @returns An Express request handler.
 *
 * @example
 * ```typescript
 * app.use(createLifecycleMiddleware(lifecycle))
 * ```
 */
export function createLifecycleMiddleware(
  provider: ProcessLifecycleProvider,
): express.RequestHandler {
  return (req, res, next) => {
    // Health probes are not traffic: counting them would make the readiness
    // report include its own request and could hold a drain open for a probe.
    const probePath = req.path === '/health/live' || req.path === '/health/ready'
    if (probePath) {
      applyDrainingResponseHeaders(provider, res)
      next()
      return
    }
    const release = provider.beginRequest()
    let released = false
    const done = (): void => {
      if (released) return
      released = true
      release()
    }
    res.once('finish', done)
    res.once('close', done)
    applyDrainingResponseHeaders(provider, res)
    next()
  }
}

/**
 * Mount `GET /health/live` and `GET /health/ready` on an Express app.
 *
 * - `/health/live` answers 200 while the process is alive, including while
 *   draining — a liveness probe must not restart a process that is finishing
 *   its in-flight work.
 * - `/health/ready` answers 200 only when the process is ready, the boot
 *   warm-up has settled, consecutive probes have passed, and every critical
 *   check passes; 503 while draining (with `Connection: close`), while the
 *   warm-up runs, or when a critical check fails. The body's `warm` field says
 *   whether the warm-up is what is holding the instance back.
 *
 * Both responses are `Cache-Control: no-store`.
 *
 * @param app - The Express app to mount the routes on.
 * @param provider - The lifecycle provider that computes the reports.
 * @param options - Optional headers for readiness responses while draining.
 */
export function mountLifecycleRoutes(
  app: express.Express,
  provider: ProcessLifecycleProvider,
  options: Pick<ExpressLifecycleOptions, 'drainingResponseHeaders'> = {},
): void {
  app.get('/health/live', async (_req, res) => {
    const report = await provider.isLive()
    const body: LivenessResponse = {
      status: report.live ? 'live' : 'not_live',
      uptimeMs: report.uptimeMs,
      checks: report.checks,
    }
    res.setHeader('Cache-Control', 'no-store')
    res.status(report.live ? 200 : 503).json(body)
  })

  app.get('/health/ready', async (_req, res) => {
    const report = await provider.isReady()
    const status: ReadinessResponse['status'] = report.ready
      ? 'ready'
      : report.draining
        ? 'draining'
        : 'not_ready'
    const body: ReadinessResponse = {
      status,
      state: report.state,
      warm: report.warm,
      inFlightRequests: report.inFlightRequests,
      checks: report.checks,
    }
    res.setHeader('Cache-Control', 'no-store')
    if (report.draining) {
      applyDrainingResponseHeaders(provider, res, options.drainingResponseHeaders?.(_req))
    }
    res.status(report.ready ? 200 : 503).json(body)
  })
}

/**
 * Wire the whole Express lifecycle in one call: bond a provider (unless one is
 * supplied), mount request tracking and health routes, and — once a server is
 * attached — install SIGTERM/SIGINT graceful shutdown.
 *
 * Call this before mounting application routes so every request is counted.
 *
 * @param options - The app, optional server/provider, bounds, logger and exit function.
 * @returns A handle exposing the provider, middleware, `markReady`, `attachServer`, `stop` and `uninstall`.
 *
 * @example
 * ```typescript
 * const lifecycle = installExpressLifecycle({ app })
 * app.use('/api', router)
 * const server = app.listen(4000, () => lifecycle.markReady())
 * lifecycle.attachServer(server)
 * ```
 */
export function installExpressLifecycle(options: ExpressLifecycleOptions): ExpressLifecycleHandle {
  // Default to the package's process-wide provider — the same instance a
  // generated `bonds/process-lifecycle-express.ts` bonds during setup — so a
  // check registered there is read by these routes.
  const provider = options.provider ?? defaultProvider
  if (options.wireProvider !== false) setProvider(provider)

  const middleware = createLifecycleMiddleware(provider)
  options.app.use(middleware)
  if (options.mountRoutes !== false) mountLifecycleRoutes(options.app, provider, options)

  let shutdown: ReturnType<typeof installGracefulShutdown> | null = null

  /**
   * Attach a listening server and install the signal handlers. Calling this
   * twice replaces the previous handlers instead of stacking them.
   *
   * @param server - The real HTTP(S) server.
   */
  const attachServer = (server: ClosableServer): void => {
    shutdown?.uninstall()
    shutdown = installGracefulShutdown({
      ...options,
      server,
      provider,
    })
  }

  if (options.server) attachServer(options.server)

  return {
    provider,
    middleware,
    markReady: () => provider.markReady(),
    attachServer,
    stop: async (signal?: string) => {
      if (!shutdown) return
      await shutdown.stop(signal)
    },
    uninstall: () => {
      shutdown?.uninstall()
    },
  }
}
