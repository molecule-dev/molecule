/**
 * Type definitions for the process lifecycle core interface.
 *
 * A process has four observable phases — it is starting, ready to serve,
 * draining (routing has been asked to stop sending traffic), or stopped. The
 * types here describe how an application reports those phases to a load
 * balancer and how it tears itself down without dropping a request.
 *
 * @module
 */

/**
 * The lifecycle phase of an API process.
 *
 * - `starting` — the process exists but has not finished its boot sequence; a
 *   load balancer must not route to it yet.
 * - `ready` — the process is serving traffic.
 * - `draining` — a shutdown was requested. Readiness reports not-ready so a
 *   load balancer stops sending new traffic, while in-flight requests finish.
 * - `stopped` — every shutdown hook has run; the process is about to exit.
 */
export type ProcessLifecycleState = 'starting' | 'ready' | 'draining' | 'stopped'

/**
 * What a check function may return. `true`/`undefined` mean the check passed;
 * `false` means it failed; an object carries a pass/fail verdict plus an
 * optional human-readable detail for logs and the readiness response body.
 */
export type LifecycleCheckOutcome = boolean | void | LifecycleCheckResult

/**
 * The detailed result of a check function.
 */
export interface LifecycleCheckResult {
  /** Whether the check passed. */
  ok: boolean
  /** Optional human-readable explanation, safe to log or return in a health response. */
  detail?: string
}

/**
 * A named readiness or liveness check.
 *
 * Checks are async-friendly and individually bounded: a check that does not
 * answer within {@link LifecycleCheck.timeoutMs} is reported as failed (and
 * `timedOut: true`) instead of holding the health endpoint open. A check that
 * throws is a failed check, never a crashed process.
 */
export interface LifecycleCheck {
  /** Unique name shown in the readiness/liveness report (e.g. `'database'`). */
  name: string
  /** The check itself. Return/resolve `true`/`undefined` to pass, `false` to fail. */
  check: () => LifecycleCheckOutcome | Promise<LifecycleCheckOutcome>
  /** Per-check timeout in milliseconds. Defaults to the provider's configured value (2000 ms). */
  timeoutMs?: number
  /**
   * Whether this check gates the overall verdict. A failing critical check
   * makes readiness (or liveness) false; a failing non-critical check is
   * reported but does not remove the process from rotation. Defaults to `true`.
   */
  critical?: boolean
  /** Optional human-readable purpose of the check, for logs. */
  description?: string
}

/**
 * The result of running one check.
 */
export interface LifecycleCheckReport {
  /** The check's name. */
  name: string
  /** Whether the check passed (a timeout or throw is a failure). */
  ok: boolean
  /** Whether this check gates the overall verdict. */
  critical: boolean
  /** How long the check took, in milliseconds. */
  durationMs: number
  /** The check's own detail, or the thrown error's message. */
  detail?: string
  /** `true` when the check did not answer inside its timeout. */
  timedOut?: boolean
}

/**
 * The answer to "may a load balancer send this process new traffic?".
 */
export interface ReadinessReport {
  /** `true` only when the process is ready, not draining, and no critical check failed. */
  ready: boolean
  /** The current lifecycle phase. */
  state: ProcessLifecycleState
  /** `true` while draining or stopped. */
  draining: boolean
  /** Number of requests currently being served. */
  inFlightRequests: number
  /** The per-check results, in registration order. Empty while draining (checks are not run). */
  checks: LifecycleCheckReport[]
}

/**
 * The answer to "is this process alive?".
 *
 * Liveness deliberately ignores drain state: a draining process is still alive
 * and restarting it would abort the requests the drain is trying to finish.
 */
export interface LivenessReport {
  /** `true` while the process has not stopped and no critical liveness check failed. */
  live: boolean
  /** The current lifecycle phase. */
  state: ProcessLifecycleState
  /** Milliseconds since the provider was created. */
  uptimeMs: number
  /** The per-check results, in registration order. */
  checks: LifecycleCheckReport[]
}

/**
 * A teardown step run during shutdown (close a pool, flush a queue, release a
 * lock). Hooks run sequentially so each resource is fully released before the
 * next one starts.
 */
export interface ShutdownHook {
  /** Unique name shown in the shutdown report and logs (e.g. `'database-pool'`). */
  name: string
  /** The teardown work. A throw or timeout is reported and does not stop later hooks. */
  run: () => void | Promise<void>
  /**
   * Execution order, lowest first. Hooks with the same order run in
   * registration order. Defaults to `0`.
   */
  order?: number
  /** Per-hook timeout in milliseconds. Defaults to the provider's configured value (10000 ms). */
  timeoutMs?: number
}

/**
 * The result of running one shutdown hook.
 */
export interface ShutdownHookReport {
  /** The hook's name. */
  name: string
  /** `true` when the hook completed without throwing or timing out. */
  ok: boolean
  /** How long the hook took, in milliseconds. */
  durationMs: number
  /** The thrown error's message, when the hook failed. */
  error?: string
  /** `true` when the hook did not finish inside its timeout. */
  timedOut?: boolean
}

/**
 * The result of a shutdown pass.
 */
export interface ShutdownReport {
  /** Always `'stopped'` once the pass finishes. */
  state: ProcessLifecycleState
  /** The reason passed to `startDraining()` / `runShutdownHooks()` (usually a signal name). */
  reason?: string
  /** Total wall-clock time of the hook pass, in milliseconds. */
  durationMs: number
  /** Requests still in flight when the hook pass started. */
  inFlightAtStart: number
  /** Per-hook results, in execution order. */
  hooks: ShutdownHookReport[]
}

/**
 * The contract every process-lifecycle provider implements.
 *
 * Application code reaches the bonded provider through the accessors in
 * `@molecule/api-process-lifecycle` (`setProvider`, `getProvider`,
 * `registerReadinessCheck`, `isReady`, …) rather than importing a provider.
 *
 * @example
 * ```typescript
 * import { getProvider } from '@molecule/api-process-lifecycle'
 *
 * const lifecycle = getProvider()
 * lifecycle.registerReadinessCheck({
 *   name: 'database',
 *   check: async () => (await db.query('select 1')).length > 0,
 * })
 * lifecycle.registerShutdownHook({ name: 'database-pool', run: () => db.pool.end() })
 * ```
 */
export interface ProcessLifecycleProvider {
  /** The current lifecycle phase. */
  state(): ProcessLifecycleState
  /** Move from `starting` to `ready` once the boot sequence has finished. */
  markReady(): void
  /** `true` while draining or stopped. */
  isDraining(): boolean
  /** Begin draining: readiness reports not-ready from this call onward. Idempotent. */
  startDraining(reason?: string): void
  /**
   * Record that a request started. The returned function releases the
   * request; it is idempotent so a `finish`/`close` pair cannot double-count.
   */
  beginRequest(): () => void
  /** Number of requests currently being served. */
  inFlightRequests(): number
  /**
   * Resolve `true` when the in-flight count reaches zero, or `false` when
   * `timeoutMs` elapses first.
   */
  waitForRequestsToDrain(timeoutMs: number): Promise<boolean>
  /**
   * Register a named readiness check.
   *
   * @returns A function that removes the check.
   */
  registerReadinessCheck(check: LifecycleCheck): () => void
  /**
   * Register a named liveness check.
   *
   * @returns A function that removes the check.
   */
  registerLivenessCheck(check: LifecycleCheck): () => void
  /**
   * Register an ordered shutdown hook.
   *
   * @returns A function that removes the hook.
   */
  registerShutdownHook(hook: ShutdownHook): () => void
  /** Run every readiness check and report whether traffic may be routed here. */
  isReady(): Promise<ReadinessReport>
  /** Run every liveness check and report whether the process is alive. */
  isLive(): Promise<LivenessReport>
  /** Run every shutdown hook in order, then mark the process stopped. Idempotent. */
  runShutdownHooks(reason?: string): Promise<ShutdownReport>
}
