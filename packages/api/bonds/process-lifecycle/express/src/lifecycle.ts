/**
 * Node implementation of the process-lifecycle provider.
 *
 * This module owns the state machine (starting → ready → draining → stopped),
 * the named check registries, the in-flight request counter and the ordered
 * shutdown-hook registry. It has no Express dependency: the HTTP-facing half
 * lives in `./express.ts`.
 *
 * @module
 */

import type {
  DrainHook,
  DrainHookReport,
  LifecycleCheck,
  LifecycleCheckReport,
  LifecycleCheckResult,
  LivenessReport,
  ProcessLifecycleProvider,
  ProcessLifecycleState,
  ReadinessReport,
  ShutdownHook,
  ShutdownHookReport,
  ShutdownReport,
  WarmupReport,
  WarmupStep,
} from '@molecule/api-process-lifecycle'

import type { LifecycleLogger, ProcessLifecycleOptions } from './types.js'
import { createWarmupGate } from './warmup.js'

/** Sentinel returned by {@link withTimeout} when the timeout wins the race. */
const TIMED_OUT = Symbol('process-lifecycle.timeout')

/** Default logger — quiet in normal operation, errors still surface. */
const consoleLogger: LifecycleLogger = {
  info: (message, context) => console.info(`[lifecycle] ${message}`, context ?? ''),
  warn: (message, context) => console.warn(`[lifecycle] ${message}`, context ?? ''),
  error: (message, context) => console.error(`[lifecycle] ${message}`, context ?? ''),
  debug: () => {},
}

/**
 * Race a promise against a timeout without leaving an unhandled rejection
 * behind when the timeout wins.
 *
 * @param work - The promise to bound.
 * @param timeoutMs - Maximum time to wait. `0` or less disables the bound.
 * @returns The work's value, or {@link TIMED_OUT}.
 */
async function withTimeout<T>(work: Promise<T>, timeoutMs: number): Promise<T | typeof TIMED_OUT> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return work
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      work,
      new Promise<typeof TIMED_OUT>((resolve) => {
        timer = setTimeout(() => resolve(TIMED_OUT), timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
    // The loser of the race must not surface as an unhandled rejection later.
    // The verdict is already decided above, so this failure is intentionally
    // not logged again.
    work.catch((_error) => undefined)
  }
}

/**
 * Normalize whatever a check returned into a pass/fail verdict.
 *
 * @param outcome - The check's return value.
 * @returns The normalized result.
 */
function normalizeOutcome(outcome: unknown): LifecycleCheckResult {
  if (outcome === false) return { ok: false }
  if (typeof outcome === 'object' && outcome !== null && 'ok' in outcome) {
    const value = outcome as LifecycleCheckResult
    return {
      ok: value.ok === true,
      ...(value.detail === undefined ? {} : { detail: value.detail }),
    }
  }
  return { ok: true }
}

/**
 * Read an error's message without trusting that a thrown value is an Error.
 *
 * @param error - The thrown value.
 * @returns A human-readable message.
 */
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Create a process-lifecycle provider.
 *
 * The returned provider is the implementation half of the core contract: it
 * holds the lifecycle phase, runs readiness/liveness checks with per-check
 * timeouts, counts in-flight requests, and runs shutdown hooks in order.
 *
 * @param options - Provider tuning (timeouts, clock, logger, hook-error callback).
 * @returns A fresh, independent provider.
 *
 * @example
 * ```typescript
 * import { createProcessLifecycleProvider } from '@molecule/api-process-lifecycle-express'
 * import { setProvider, registerReadinessCheck } from '@molecule/api-process-lifecycle'
 *
 * const lifecycle = createProcessLifecycleProvider()
 * setProvider(lifecycle)
 * registerReadinessCheck({ name: 'database', check: () => db.ping() })
 * lifecycle.markReady()
 * ```
 */
export function createProcessLifecycleProvider(
  options: ProcessLifecycleOptions = {},
): ProcessLifecycleProvider {
  const defaultCheckTimeoutMs = options.defaultCheckTimeoutMs ?? 2_000
  const defaultHookTimeoutMs = options.defaultHookTimeoutMs ?? 10_000
  const now = options.now ?? (() => Date.now())
  const logger = options.logger ?? consoleLogger
  const startedAt = now()

  let state: ProcessLifecycleState = 'starting'
  let drainReason: string | undefined
  let inFlight = 0
  let shutdownPromise: Promise<ShutdownReport> | null = null
  let drainPromise: Promise<DrainHookReport[]> | null = null

  const readinessChecks = new Map<string, LifecycleCheck>()
  const livenessChecks = new Map<string, LifecycleCheck>()
  const shutdownHooks = new Map<string, { hook: ShutdownHook; sequence: number }>()
  const drainHooks = new Map<string, { hook: DrainHook; sequence: number }>()
  let hookSequence = 0
  let drainSequence = 0

  /**
   * The boot warm-up gate: readiness stays closed until this settles, then
   * requires consecutive passing probes. See `./warmup.ts` for why.
   */
  const warmupGate = createWarmupGate({
    timeoutMs: options.defaultWarmupStepTimeoutMs,
    consecutivePasses: options.consecutiveReadyPasses,
    now,
    logger,
  })

  /** Resolvers waiting for the in-flight count to reach zero. */
  const idleWaiters = new Set<(drained: boolean) => void>()

  /**
   * Resolve every waiter once nothing is in flight.
   */
  const notifyIdle = (): void => {
    if (inFlight !== 0) return
    for (const resolve of idleWaiters) resolve(true)
    idleWaiters.clear()
  }

  /**
   * Run a single check with its own timeout, converting a throw or timeout
   * into a failed report.
   *
   * @param check - The check to run.
   * @returns The check's report.
   */
  async function runCheck(check: LifecycleCheck): Promise<LifecycleCheckReport> {
    const started = now()
    const timeoutMs = check.timeoutMs ?? defaultCheckTimeoutMs
    const critical = check.critical ?? true
    try {
      const outcome = await withTimeout(
        Promise.resolve().then(() => check.check()),
        timeoutMs,
      )
      const durationMs = now() - started
      if (outcome === TIMED_OUT) {
        return {
          name: check.name,
          ok: false,
          critical,
          durationMs,
          detail: `timed out after ${timeoutMs}ms`,
          timedOut: true,
        }
      }
      const normalized = normalizeOutcome(outcome)
      return {
        name: check.name,
        ok: normalized.ok,
        critical,
        durationMs,
        ...(normalized.detail === undefined ? {} : { detail: normalized.detail }),
      }
    } catch (error) {
      return {
        name: check.name,
        ok: false,
        critical,
        durationMs: now() - started,
        detail: errorMessage(error),
      }
    }
  }

  /**
   * Run every check in a registry, concurrently.
   *
   * @param checks - The registry to run.
   * @returns One report per check, in registration order.
   */
  async function runChecks(checks: Map<string, LifecycleCheck>): Promise<LifecycleCheckReport[]> {
    return Promise.all([...checks.values()].map((check) => runCheck(check)))
  }

  /**
   * Whether every critical check passed.
   *
   * @param reports - The check reports.
   * @returns `true` when no critical check failed.
   */
  const allCriticalPassed = (reports: LifecycleCheckReport[]): boolean =>
    reports.every((report) => report.ok || !report.critical)

  const provider: ProcessLifecycleProvider = {
    state: () => state,

    markReady: () => {
      if (state === 'starting') state = 'ready'
      // The listener owns the port, so the boot warm-up can run. Readiness
      // stays closed until the pass settles and consecutive probes pass.
      void warmupGate.run()
    },

    isDraining: () => state === 'draining' || state === 'stopped',

    startDraining: (reason?: string) => {
      if (state === 'stopped') return
      drainReason = reason ?? drainReason
      state = 'draining'
    },

    beginRequest: () => {
      inFlight += 1
      let released = false
      return () => {
        if (released) return
        released = true
        inFlight = Math.max(0, inFlight - 1)
        notifyIdle()
      }
    },

    inFlightRequests: () => inFlight,

    waitForRequestsToDrain: (timeoutMs: number) => {
      if (inFlight === 0) return Promise.resolve(true)
      return new Promise<boolean>((resolve) => {
        let settled = false
        const finish = (drained: boolean): void => {
          if (settled) return
          settled = true
          clearTimeout(timer)
          idleWaiters.delete(finish)
          resolve(drained)
        }
        const timer = setTimeout(() => finish(false), Math.max(0, timeoutMs))
        idleWaiters.add(finish)
      })
    },

    registerReadinessCheck: (check: LifecycleCheck) => {
      readinessChecks.set(check.name, check)
      return () => {
        if (readinessChecks.get(check.name) === check) readinessChecks.delete(check.name)
      }
    },

    registerLivenessCheck: (check: LifecycleCheck) => {
      livenessChecks.set(check.name, check)
      return () => {
        if (livenessChecks.get(check.name) === check) livenessChecks.delete(check.name)
      }
    },

    registerShutdownHook: (hook: ShutdownHook) => {
      shutdownHooks.set(hook.name, { hook, sequence: hookSequence++ })
      return () => {
        const entry = shutdownHooks.get(hook.name)
        if (entry?.hook === hook) shutdownHooks.delete(hook.name)
      }
    },

    registerWarmupStep: (step: WarmupStep) => {
      // Register before the listener is ready: `markReady()` runs the pass, and
      // the gate is one-shot by design, so a step added afterwards would not be
      // observed. Setup code (a database bond, a module preload) registers from
      // `setupBonds()` / before `listen`, which is early enough.
      return warmupGate.registerStep(step)
    },

    runWarmup: (): Promise<WarmupReport> => warmupGate.run(),

    isWarm: (): boolean => warmupGate.isSettled(),

    registerDrainHook: (hook: DrainHook) => {
      drainHooks.set(hook.name, { hook, sequence: drainSequence++ })
      return () => {
        const entry = drainHooks.get(hook.name)
        if (entry?.hook === hook) drainHooks.delete(hook.name)
      }
    },

    runDrainHooks: (reason?: string): Promise<DrainHookReport[]> => {
      if (drainPromise) return drainPromise
      drainPromise = (async () => {
        const ordered = [...drainHooks.values()].sort(
          (a, b) => (a.hook.order ?? 0) - (b.hook.order ?? 0) || a.sequence - b.sequence,
        )
        const reports: DrainHookReport[] = []
        for (const { hook } of ordered) {
          const hookStarted = now()
          const timeoutMs = hook.timeoutMs ?? defaultHookTimeoutMs
          try {
            const outcome = await withTimeout(
              Promise.resolve().then(() => hook.run(reason)),
              timeoutMs,
            )
            if (outcome === TIMED_OUT) {
              reports.push({
                name: hook.name,
                ok: false,
                durationMs: now() - hookStarted,
                error: `timed out after ${timeoutMs}ms`,
                timedOut: true,
              })
              logger.error(`Drain hook '${hook.name}' timed out after ${timeoutMs}ms.`)
              options.onHookError?.(hook.name, new Error(`timed out after ${timeoutMs}ms`))
            } else {
              reports.push({ name: hook.name, ok: true, durationMs: now() - hookStarted })
            }
          } catch (error) {
            reports.push({
              name: hook.name,
              ok: false,
              durationMs: now() - hookStarted,
              error: errorMessage(error),
            })
            logger.error(`Drain hook '${hook.name}' failed.`, { error })
            options.onHookError?.(hook.name, error)
          }
        }
        return reports
      })()
      return drainPromise
    },

    isReady: async (): Promise<ReadinessReport> => {
      if (state === 'draining' || state === 'stopped') {
        return {
          ready: false,
          state,
          draining: true,
          warm: warmupGate.isSettled(),
          inFlightRequests: inFlight,
          checks: [],
        }
      }
      const checks = await runChecks(readinessChecks)
      const passing = state === 'ready' && allCriticalPassed(checks)
      return {
        ready: warmupGate.observe(passing),
        state,
        draining: false,
        warm: warmupGate.isSettled(),
        inFlightRequests: inFlight,
        checks,
      }
    },

    isLive: async (): Promise<LivenessReport> => {
      const checks = await runChecks(livenessChecks)
      return {
        live: state !== 'stopped' && allCriticalPassed(checks),
        state,
        uptimeMs: now() - startedAt,
        checks,
      }
    },

    runShutdownHooks: (reason?: string): Promise<ShutdownReport> => {
      if (shutdownPromise) return shutdownPromise
      shutdownPromise = (async () => {
        const started = now()
        const inFlightAtStart = inFlight
        if (state !== 'stopped') {
          drainReason = reason ?? drainReason
          state = 'draining'
        }
        const ordered = [...shutdownHooks.values()].sort(
          (a, b) => (a.hook.order ?? 0) - (b.hook.order ?? 0) || a.sequence - b.sequence,
        )
        const reports: ShutdownHookReport[] = []
        for (const { hook } of ordered) {
          const hookStarted = now()
          const timeoutMs = hook.timeoutMs ?? defaultHookTimeoutMs
          try {
            const outcome = await withTimeout(
              Promise.resolve().then(() => hook.run()),
              timeoutMs,
            )
            if (outcome === TIMED_OUT) {
              reports.push({
                name: hook.name,
                ok: false,
                durationMs: now() - hookStarted,
                error: `timed out after ${timeoutMs}ms`,
                timedOut: true,
              })
              logger.error(`Shutdown hook '${hook.name}' timed out after ${timeoutMs}ms.`)
              options.onHookError?.(hook.name, new Error(`timed out after ${timeoutMs}ms`))
            } else {
              reports.push({ name: hook.name, ok: true, durationMs: now() - hookStarted })
            }
          } catch (error) {
            reports.push({
              name: hook.name,
              ok: false,
              durationMs: now() - hookStarted,
              error: errorMessage(error),
            })
            logger.error(`Shutdown hook '${hook.name}' failed.`, { error })
            options.onHookError?.(hook.name, error)
          }
        }
        state = 'stopped'
        return {
          state,
          ...(drainReason === undefined ? {} : { reason: drainReason }),
          durationMs: now() - started,
          inFlightAtStart,
          hooks: reports,
        }
      })()
      return shutdownPromise
    },
  }

  return provider
}

/**
 * The process-lifecycle provider singleton for this process.
 *
 * Exported so a bond can be wired with the conventional
 * `import { provider } from '@molecule/api-process-lifecycle-express'` shape.
 * Applications that need an isolated instance (tests, embedded servers) call
 * {@link createProcessLifecycleProvider} instead.
 */
export const provider: ProcessLifecycleProvider = createProcessLifecycleProvider()
