/**
 * Provider-specific option and handle types for the Express process-lifecycle bond.
 *
 * The core contract lives in `@molecule/api-process-lifecycle`; these types
 * describe how this provider is configured on a Node/Express process.
 *
 * @module
 */

import type express from 'express'

import type {
  LifecycleCheckReport,
  ProcessLifecycleProvider,
} from '@molecule/api-process-lifecycle'

/**
 * The subset of an HTTP server the graceful-shutdown installer needs.
 *
 * Declared structurally so tests (and non-`http.Server` wrappers) can pass a
 * double without constructing a real listener.
 */
export interface ClosableServer {
  /**
   * Stop accepting new connections.
   *
   * @param callback - Optional completion callback.
   */
  close(callback?: (error?: Error) => void): unknown
  /** Close idle keep-alive connections (Node 18.2+). */
  closeIdleConnections?(): void
  /** Force-close every remaining connection (Node 18.2+). */
  closeAllConnections?(): void
}

/**
 * The logging surface the provider uses. Every method is optional so a caller
 * can pass a partial logger (or nothing, in which case `console` is used).
 */
export interface LifecycleLogger {
  /** Informational lifecycle transitions (draining, shutdown complete). */
  info(message: string, context?: Record<string, unknown>): void
  /** Recoverable problems (a drain timeout, a failed hook). */
  warn(message: string, context?: Record<string, unknown>): void
  /** Genuine failures during shutdown. */
  error(message: string, context?: unknown): void
  /** Best-effort detail that should stay quiet by default. */
  debug(message: string, context?: Record<string, unknown>): void
}

/**
 * Options for {@link createProcessLifecycleProvider}.
 */
export interface ProcessLifecycleOptions {
  /** Timeout applied to a check that declares no `timeoutMs`. Defaults to `2000`. */
  defaultCheckTimeoutMs?: number
  /** Timeout applied to a shutdown hook that declares no `timeoutMs`. Defaults to `10000`. */
  defaultHookTimeoutMs?: number
  /** Clock used for durations. Defaults to `Date.now` (tests may inject a fake clock). */
  now?: () => number
  /** Called after a shutdown hook throws or times out, in addition to the error log. */
  onHookError?: (name: string, error: unknown) => void
  /** Logger used for hook failures. Defaults to `@molecule/api-logger` when bonded. */
  logger?: LifecycleLogger
}

/**
 * Options for {@link installGracefulShutdown}.
 */
export interface GracefulShutdownOptions {
  /** The listening HTTP(S) server whose connections are drained. */
  server: ClosableServer
  /** The lifecycle provider that owns drain state, request count and hooks. */
  provider: ProcessLifecycleProvider
  /**
   * Maximum time to wait for in-flight requests after `server.close()`.
   * Defaults to `SHUTDOWN_TIMEOUT_MS` (read through `@molecule/api-config`
   * when bonded, else `process.env`), falling back to `25000`.
   */
  drainTimeoutMs?: number
  /**
   * Time to keep listening after draining starts, so a load balancer can
   * observe `/health/ready` returning 503 before the listener closes. Defaults
   * to `SHUTDOWN_LB_FLIP_WAIT_MS` (falling back to `5000` in production and
   * `0` elsewhere).
   */
  flipWaitMs?: number
  /**
   * How to end the process. Defaults to `process.exit`. Injected in tests so a
   * signal can be exercised without terminating the test runner.
   *
   * @param code - Exit code (`0` for a drained shutdown, `1` for a failed or forced one).
   */
  exit?: (code: number) => void
  /** Signals to handle. Defaults to `['SIGTERM', 'SIGINT']`. */
  signals?: NodeJS.Signals[]
  /** Logger override. */
  logger?: LifecycleLogger
}

/**
 * The handle returned by {@link installGracefulShutdown}.
 */
export interface GracefulShutdownHandle {
  /**
   * Run the shutdown sequence as a signal would.
   *
   * @param signal - Label recorded in logs and the shutdown report (defaults to `'SIGTERM'`).
   */
  stop(signal?: string): Promise<void>
  /** Remove the installed signal listeners. Used by tests after `stop()`. */
  uninstall(): void
}

/**
 * Options for {@link installExpressLifecycle}.
 */
export interface ExpressLifecycleOptions extends Omit<
  GracefulShutdownOptions,
  'server' | 'provider'
> {
  /** The Express app to mount request tracking and health routes on. */
  app: express.Express
  /**
   * The real HTTP(S) server, when it already exists. When omitted, call
   * {@link ExpressLifecycleHandle.attachServer} once it does.
   */
  server?: ClosableServer
  /** A provider to use instead of a fresh one (tests, or a pre-bonded instance). */
  provider?: ProcessLifecycleProvider
  /** Mount `GET /health/live` and `GET /health/ready`. Defaults to `true`. */
  mountRoutes?: boolean
  /**
   * Bond the provider through `setProvider()` so `@molecule/api-process-lifecycle`
   * accessors resolve to it. Defaults to `true`.
   */
  wireProvider?: boolean
  /** Install the SIGTERM/SIGINT handlers once a server is attached. Defaults to `true`. */
  installSignalHandlers?: boolean
}

/**
 * The handle returned by {@link installExpressLifecycle}.
 */
export interface ExpressLifecycleHandle {
  /** The provider backing this app. */
  provider: ProcessLifecycleProvider
  /** The Express middleware that tracks in-flight requests and sets `Connection: close` while draining. */
  middleware: express.RequestHandler
  /** Mark the process ready. Call from the server's `listening` callback. */
  markReady(): void
  /**
   * Attach the listening server, installing the signal handlers.
   *
   * @param server - The real HTTP(S) server.
   */
  attachServer(server: ClosableServer): void
  /**
   * Run the shutdown sequence as a signal would.
   *
   * @param signal - Label recorded in logs and the shutdown report.
   */
  stop(signal?: string): Promise<void>
  /** Remove the installed signal listeners. */
  uninstall(): void
}

/**
 * The JSON body returned by `GET /health/live`.
 */
export interface LivenessResponse {
  /** `'live'` when the process is alive. */
  status: 'live' | 'not_live'
  /** Milliseconds since the provider was created. */
  uptimeMs: number
  /** Per-check results. */
  checks: LifecycleCheckReport[]
}

/**
 * The JSON body returned by `GET /health/ready`.
 */
export interface ReadinessResponse {
  /** `'ready'`, `'draining'` or `'not_ready'`. */
  status: 'ready' | 'draining' | 'not_ready'
  /** The lifecycle phase the report was computed in. */
  state: string
  /** Number of requests being served when the report was computed. */
  inFlightRequests: number
  /** Per-check results. Empty while draining. */
  checks: LifecycleCheckReport[]
}
