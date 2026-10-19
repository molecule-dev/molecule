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
  return readLifecycleNumber(key) ?? fallback
}

/**
 * Read an optional numeric lifecycle setting.
 *
 * Same precedence as {@link resolveLifecycleNumber} (bonded config provider,
 * then `process.env`), but an absent or non-numeric value stays `undefined` so
 * a caller can tell "not declared" from "declared as zero".
 *
 * @param key - The configuration key.
 * @returns The resolved number, or `undefined` when the key is not declared.
 */
export function readLifecycleNumber(key: string): number | undefined {
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
  if (raw === undefined || raw.trim() === '') return undefined
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : undefined
}

/**
 * The load-balancer health check the application declares, in milliseconds.
 *
 * Fly does NOT expose its check interval or timeout as environment variables —
 * the Machine runtime environment carries only `FLY_APP_NAME`,
 * `FLY_MACHINE_ID`, `FLY_REGION`, `FLY_PUBLIC_IP`, `FLY_PRIVATE_IP`,
 * `FLY_IMAGE_REF`, `FLY_MACHINE_VERSION`, `FLY_PROCESS_GROUP` and
 * `FLY_VM_MEMORY_MB` — so an application (or its deployment config) mirrors
 * `[http_service.checks]` into these two variables. Without them the correct
 * flip window cannot be derived and the package falls back to its static
 * default.
 */
export interface HealthcheckDeclaration {
  /** How often the load balancer probes `/health/ready`, when declared. */
  intervalMs?: number
  /** The probe's timeout, when declared. Treated as `0` when absent. */
  timeoutMs?: number
}

/** Margin added to the derived flip window (ms), on top of 3 x interval + timeout. */
const HEALTHCHECK_MARGIN_MS = 2_000

/**
 * Read the declared load-balancer check from `LB_HEALTHCHECK_INTERVAL_MS` and
 * `LB_HEALTHCHECK_TIMEOUT_MS`.
 *
 * @returns The declaration; both fields are absent when nothing is declared.
 */
export function resolveHealthcheckDeclaration(): HealthcheckDeclaration {
  const intervalMs = readLifecycleNumber('LB_HEALTHCHECK_INTERVAL_MS')
  const timeoutMs = readLifecycleNumber('LB_HEALTHCHECK_TIMEOUT_MS')
  return {
    ...(intervalMs === undefined ? {} : { intervalMs }),
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
  }
}

/**
 * The flip window a declared check needs: three intervals plus the timeout
 * plus a 2 s margin.
 *
 * Three intervals, not two: Fly does not document whether its proxy flips
 * after two or three consecutive failed checks, and the measured 2026-10-19
 * restart showed a 5 s window was too short for a 30 s interval.
 *
 * @param declaration - The declared check.
 * @returns The derived window in milliseconds, or `0` when no interval is declared.
 */
export function derivedFlipWaitMs(declaration: HealthcheckDeclaration): number {
  if (declaration.intervalMs === undefined) return 0
  return 3 * declaration.intervalMs + (declaration.timeoutMs ?? 0) + HEALTHCHECK_MARGIN_MS
}

/**
 * The effective load-balancer flip window for this process.
 *
 * Precedence: an explicit option, then `SHUTDOWN_LB_FLIP_WAIT_MS`, then a
 * value derived from the declared check, then the static default (5 s in
 * production, 0 elsewhere).
 *
 * @param args - The option override and an already-resolved declaration.
 * @returns The window in milliseconds.
 */
export function resolveFlipWaitMs(
  args: { flipWaitMs?: number; declaration?: HealthcheckDeclaration } = {},
): number {
  if (args.flipWaitMs !== undefined) return args.flipWaitMs
  const explicit = readLifecycleNumber('SHUTDOWN_LB_FLIP_WAIT_MS')
  if (explicit !== undefined) return explicit
  const derived = derivedFlipWaitMs(args.declaration ?? resolveHealthcheckDeclaration())
  if (derived > 0) return derived
  return process.env.NODE_ENV === 'production' ? 5_000 : 0
}

/**
 * Check the flip window against the declared health check.
 *
 * A flip window shorter than `2 x interval + timeout` cannot give the load
 * balancer time to observe two consecutive failed checks before the listener
 * closes, so a rolling restart drops requests. The message names both numbers
 * and the fix; the caller logs it once, at boot.
 *
 * @param args - The declaration and the effective flip window.
 * @returns The warning message, or `null` when the window is long enough.
 */
export function checkHealthcheckConsistency(args: {
  declaration: HealthcheckDeclaration
  flipWaitMs: number
}): string | null {
  const { intervalMs, timeoutMs } = args.declaration
  if (intervalMs === undefined) return null
  const timeout = timeoutMs ?? 0
  const requiredMs = 2 * intervalMs + timeout
  if (args.flipWaitMs >= requiredMs) return null
  const recommendedMs = 3 * intervalMs + timeout + HEALTHCHECK_MARGIN_MS
  return (
    `Load-balancer health check mismatch: the check runs every ${intervalMs}ms with a ${timeout}ms timeout, ` +
    `so the proxy needs at least ${requiredMs}ms (2 x interval + timeout) to observe two failed checks, ` +
    `but the shutdown flip window is only ${args.flipWaitMs}ms. Requests will keep arriving after ` +
    `/health/ready turns 503 and be refused. Fix: set SHUTDOWN_LB_FLIP_WAIT_MS=${recommendedMs} ` +
    `(3 x interval + timeout + ${HEALTHCHECK_MARGIN_MS}ms margin), or unset LB_HEALTHCHECK_INTERVAL_MS.`
  )
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
 * 2. Run the registered drain hooks (bounded, never fatal). A hook that throws
 *    does not skip step 3.
 * 3. Wait `flipWaitMs` while the listener is still open, giving the load
 *    balancer time to observe the 503 before the connection is refused. The
 *    window is derived from `LB_HEALTHCHECK_INTERVAL_MS` /
 *    `LB_HEALTHCHECK_TIMEOUT_MS` when those are declared, and a window too
 *    short for them logs one warning at boot.
 * 4. `closeIdleConnections()` then `server.close()` — no new connections are
 *    accepted, and a proxy holding an idle keep-alive socket must open a new
 *    one; responses already in flight carry `Connection: close`.
 * 5. Wait up to `drainTimeoutMs` for the in-flight count to reach zero. If the
 *    bound expires (an SSE/WebSocket stream, a stuck handler), log it and
 *    `closeAllConnections()`.
 * 6. Run the ordered shutdown hooks (database pool, Redis, queues, …).
 * 7. Exit `0`.
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

  // Resolve the flip window once, at boot, and check it against the declared
  // load-balancer check. A mismatch is logged ONCE here — not per request and
  // not per signal — because the fix is configuration, not retry behaviour.
  const declaration = resolveHealthcheckDeclaration()
  const flipWaitMs = resolveFlipWaitMs({ flipWaitMs: options.flipWaitMs, declaration })
  const healthcheckWarning = checkHealthcheckConsistency({ declaration, flipWaitMs })
  if (healthcheckWarning) logger.warn(healthcheckWarning)

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

    try {
      provider.startDraining(signal)
      logger.info(
        `Draining before shutdown (${signal}): ${provider.inFlightRequests()} request(s) in flight.`,
      )

      // DRAIN HOOKS first: checkpoint work that a force-kill during the flip
      // window would otherwise lose. They are bounded by the provider, and a
      // failure here must NOT skip the flip window — the window is the only
      // thing standing between "readiness is 503" and a closed listener.
      try {
        await provider.runDrainHooks(signal)
      } catch (error) {
        // Defensive: a custom provider may reject. The window still runs.
        logger.error('Drain hooks failed; the load-balancer flip window still runs.', { error })
      }

      // THE LOAD-BALANCER FLIP WINDOW — its own step, deliberately outside the
      // drain-hook try above. Readiness flipped to 503 at `startDraining`; the
      // listener stays open so the proxy can observe the failed checks and
      // re-route before new connections are refused.
      if (flipWaitMs > 0) await delay(flipWaitMs)

      // The proxy has had its window to observe the 503. Drop idle keep-alive
      // sockets now so a proxy that still holds a pooled connection cannot send
      // another request here; in-flight requests and the listener stay open
      // until `server.close()` below.
      try {
        server.closeIdleConnections?.()
      } catch (error) {
        logger.debug('closeIdleConnections after the flip window failed', { error })
      }

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
