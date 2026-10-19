/**
 * Graceful-shutdown installer for Node HTTP servers.
 *
 * On SIGTERM/SIGINT the installer flips the provider to draining, keeps
 * listening for a short load-balancer flip window, stops accepting new
 * connections, waits for in-flight requests (bounded), force-closes anything
 * still open, runs the ordered shutdown hooks, and exits `0`.
 *
 * @module
 */

import { getNumber, hasProvider as hasConfigProvider } from '@molecule/api-config'
import type { ProcessLifecycleProvider } from '@molecule/api-process-lifecycle'

import type { GracefulShutdownHandle, GracefulShutdownOptions, LifecycleLogger } from './types.js'

/** Default logger used when the caller passes none. */
const consoleLogger: LifecycleLogger = {
  info: (message, context) => console.info(`[lifecycle] ${message}`, context ?? ''),
  warn: (message, context) => console.warn(`[lifecycle] ${message}`, context ?? ''),
  error: (message, context) => console.error(`[lifecycle] ${message}`, context ?? ''),
  debug: () => {},
}

/**
 * Read a numeric lifecycle setting.
 *
 * Precedence: the bonded `@molecule/api-config` provider (when one is wired,
 * so a Vault/SSM provider is honored), then `process.env`, then the fallback.
 * A non-numeric value is ignored rather than turning into `NaN`.
 *
 * @param key - The configuration key (e.g. `'SHUTDOWN_TIMEOUT_MS'`).
 * @param fallback - Value used when neither source provides a number.
 * @returns The resolved number.
 */
export function resolveLifecycleNumber(key: string, fallback: number): number {
  try {
    if (hasConfigProvider()) {
      const configured = getNumber(key)
      if (configured !== undefined && Number.isFinite(configured)) return configured
    }
  } catch (_error) {
    // A provider that cannot answer this key is not a shutdown failure — fall
    // through to the environment and the default.
  }
  const raw = process.env[key]
  if (raw === undefined || raw.trim() === '') return fallback
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

/**
 * Wait for a fixed time.
 *
 * @param ms - Milliseconds to wait.
 * @returns A promise that resolves after `ms`.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Install SIGTERM/SIGINT handlers that drain and shut the process down cleanly.
 *
 * The sequence, in order:
 *
 * 1. `provider.startDraining(signal)` — `/health/ready` answers 503 from this
 *    instant, so a load balancer stops routing here.
 * 2. Wait `flipWaitMs` while the listener is still open, giving the load
 *    balancer time to observe the 503 before the connection is refused.
 * 3. `server.close()` + `closeIdleConnections()` — no new connections are
 *    accepted; responses already in flight carry `Connection: close`.
 * 4. Wait up to `drainTimeoutMs` for the in-flight count to reach zero. If the
 *    bound expires (an SSE/WebSocket stream, a stuck handler), log it and
 *    `closeAllConnections()`.
 * 5. Run the ordered shutdown hooks (database pool, Redis, queues, …).
 * 6. Exit `0`.
 *
 * A second signal while the first is still draining exits `1` immediately
 * rather than stacking a second drain. The handlers never throw.
 *
 * @param options - The server, provider, bounds, logger and exit function.
 * @returns A handle exposing the same sequence (`stop`) and `uninstall`.
 *
 * @example
 * ```typescript
 * import { createServer } from 'node:http'
 * import { installGracefulShutdown } from '@molecule/api-process-lifecycle-express'
 *
 * const server = createServer(app).listen(4000)
 * installGracefulShutdown({ server, provider: lifecycle })
 * ```
 */
export function installGracefulShutdown(options: GracefulShutdownOptions): GracefulShutdownHandle {
  const { server, provider } = options
  const logger = options.logger ?? consoleLogger
  const exit = options.exit ?? ((code: number) => process.exit(code))
  const signals = options.signals ?? ['SIGTERM', 'SIGINT']

  let stopping = false
  const handlers = new Map<NodeJS.Signals, () => void>()

  /**
   * Run the graceful shutdown sequence.
   *
   * @param signal - The signal name (or a test label) that requested the stop.
   */
  const stop = async (signal: string = 'SIGTERM'): Promise<void> => {
    if (stopping) {
      // A second signal means the operator/supervisor is out of patience.
      // Exit immediately; never throw out of a signal handler.
      logger.warn(`Second ${signal} during shutdown — exiting immediately.`)
      exit(1)
      return
    }
    stopping = true

    const drainTimeoutMs =
      options.drainTimeoutMs ?? resolveLifecycleNumber('SHUTDOWN_TIMEOUT_MS', 25_000)
    const flipWaitMs =
      options.flipWaitMs ??
      resolveLifecycleNumber(
        'SHUTDOWN_LB_FLIP_WAIT_MS',
        process.env.NODE_ENV === 'production' ? 5_000 : 0,
      )

    try {
      provider.startDraining(signal)
      logger.info(
        `Draining before shutdown (${signal}): ${provider.inFlightRequests()} request(s) in flight.`,
      )

      if (flipWaitMs > 0) await delay(flipWaitMs)

      try {
        server.close(() => {
          // The callback fires when every connection has ended. The provider's
          // in-flight counter is the bound we actually wait on (it can reach
          // zero while a keep-alive socket remains), so this is informational.
        })
      } catch (error) {
        logger.debug('server.close() during shutdown failed', { error })
      }
      server.closeIdleConnections?.()

      const drained = await provider.waitForRequestsToDrain(Math.max(0, drainTimeoutMs))
      if (!drained) {
        logger.warn(
          `Drain timed out after ${drainTimeoutMs}ms with ${provider.inFlightRequests()} request(s) still open — closing connections.`,
        )
        server.closeAllConnections?.()
      }

      const report = await provider.runShutdownHooks(signal)
      logger.info(
        `Shutdown complete (${signal}) in ${report.durationMs}ms; ${report.hooks.length} hook(s) ran.`,
      )
    } catch (error) {
      logger.error('Graceful shutdown failed; exiting with code 1.', { error })
      exit(1)
      return
    }

    exit(0)
  }

  for (const signal of signals) {
    const handler = (): void => {
      void stop(signal)
    }
    handlers.set(signal, handler)
    process.on(signal, handler)
  }

  return {
    stop,
    uninstall: () => {
      for (const [signal, handler] of handlers) process.off(signal, handler)
      handlers.clear()
    },
  }
}

/**
 * Re-exported provider type so a caller can name the provider in its own
 * signatures without importing the core package directly.
 */
export type { ProcessLifecycleProvider }
