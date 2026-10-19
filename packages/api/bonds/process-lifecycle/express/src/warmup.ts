/**
 * The boot warm-up gate shared by the provider and by applications that keep
 * their own readiness aggregation.
 *
 * WHY (measured 2026-10-19): a rolling deploy takes the next instance down as
 * soon as this one's health check passes. Readiness used to pass on the first
 * check after `listen`, while the process was still loading its module graph
 * and preloading caches; the load balancer then stopped the sibling while this
 * instance was the only one serving and its event loop was saturated, so
 * requests exceeded the proxy's check timeout. The gate closes readiness until
 * the boot work has settled and requires N consecutive passing probes — the
 * first probe after a restart cannot hand an instance the whole deployment's
 * traffic.
 *
 * A step that throws or times out is reported and logged and the pass still
 * settles: a broken preload must not hold an instance out of rotation for the
 * whole deploy window.
 *
 * @module
 */

import type { WarmupReport, WarmupStep, WarmupStepReport } from '@molecule/api-process-lifecycle'

import type { LifecycleLogger } from './types.js'

/** How long a warmed step may take when it declares no `timeoutMs`. */
export const DEFAULT_WARMUP_TIMEOUT_MS = 45_000

/**
 * Passing probes required in a row before readiness answers 200.
 *
 * Two (not one) because a single pass can be a moment between two heavy
 * imports: with a load balancer polling every few seconds, two in a row means
 * the event loop has actually had to schedule the probe.
 */
export const DEFAULT_CONSECUTIVE_READY_PASSES = 2

/** The logging surface the gate needs; a full {@link LifecycleLogger} satisfies it. */
export type WarmupGateLogger = Pick<LifecycleLogger, 'warn' | 'error'>

/** Options for {@link createWarmupGate}. */
export interface WarmupGateOptions {
  /** Default per-step timeout when a step declares none. Defaults to 45 s. */
  timeoutMs?: number
  /** Passing probes required in a row before readiness passes. Defaults to 2. */
  consecutivePasses?: number
  /** Clock used for durations. Defaults to `Date.now`. */
  now?: () => number
  /** Logger for failed and timed-out steps. Defaults to `console`. */
  logger?: WarmupGateLogger
}

/** Options for one {@link WarmupGate.run} call (tests and one-off overrides). */
export interface WarmupGateRunOptions {
  /** Default per-step timeout for this pass. Overrides the gate's value. */
  timeoutMs?: number
  /** Logger for this pass. Overrides the gate's logger. */
  logger?: WarmupGateLogger
}

/**
 * The warm-up gate: a one-shot pass over named steps, plus the consecutive
 * passing-probe counter that decides when readiness may answer 200.
 */
export interface WarmupGate {
  /**
   * Register a step to run on every {@link WarmupGate.run} call.
   *
   * @param step - The step to register.
   * @returns A function that removes the step.
   */
  registerStep(step: WarmupStep): () => void
  /**
   * Run the registered steps (plus any one-off `extraSteps`) once.
   *
   * Idempotent: a second call joins the in-flight pass. Never rejects.
   *
   * @param extraSteps - One-off steps, run after the registered ones.
   * @param options - Per-pass timeout and logger overrides.
   * @returns The pass report.
   */
  run(extraSteps?: WarmupStep[], options?: WarmupGateRunOptions): Promise<WarmupReport>
  /** Whether the pass has settled (every step completed or timed out). */
  isSettled(): boolean
  /** Mark the pass settled without running it (tests, or nothing to warm). */
  markSettled(): void
  /**
   * Record one readiness observation.
   *
   * @param passing - Whether every other readiness gate passed for this probe.
   * @returns `true` when the gate is settled and N consecutive passes were seen.
   */
  observe(passing: boolean): boolean
  /** Forget everything: a new process instance has not warmed up yet. */
  reset(): void
}

/** Default logger — quiet except for the failures the gate exists to report. */
const consoleLogger: WarmupGateLogger = {
  warn: (message, context) => console.warn(`[lifecycle] ${message}`, context ?? ''),
  error: (message, context) => console.error(`[lifecycle] ${message}`, context ?? ''),
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
 * Run one step against its timeout.
 *
 * Never rejects; a throw or timeout becomes a failed report entry.
 *
 * @param step - The step to run.
 * @param defaultTimeoutMs - Timeout when the step declares none.
 * @param log - Logger for the failure.
 * @param now - Clock.
 * @returns The step report.
 */
async function runStep(
  step: WarmupStep,
  defaultTimeoutMs: number,
  log: WarmupGateLogger,
  now: () => number,
): Promise<WarmupStepReport> {
  const started = now()
  const timeoutMs = step.timeoutMs ?? defaultTimeoutMs
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const work = Promise.resolve().then(() => step.run())
    // The loser of the race must not surface as an unhandled rejection later.
    work.catch((_error) => undefined)
    const outcome = await Promise.race([
      work.then(() => true),
      new Promise<false>((resolve) => {
        timer = setTimeout(() => resolve(false), Math.max(0, timeoutMs))
      }),
    ])
    if (!outcome) {
      log.warn(
        `Warm-up step '${step.name}' did not settle within ${timeoutMs}ms; readiness opens when the pass settles.`,
      )
      return {
        name: step.name,
        ok: false,
        durationMs: now() - started,
        error: `timed out after ${timeoutMs}ms`,
        timedOut: true,
      }
    }
    return { name: step.name, ok: true, durationMs: now() - started }
  } catch (error) {
    log.error(`Warm-up step '${step.name}' failed; readiness opens when the pass settles.`, {
      error,
    })
    return {
      name: step.name,
      ok: false,
      durationMs: now() - started,
      error: errorMessage(error),
    }
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/**
 * Create a warm-up gate.
 *
 * @param options - Timeout, consecutive-pass count, clock and logger.
 * @returns A fresh, independent gate.
 *
 * @example
 * ```typescript
 * const gate = createWarmupGate({ timeoutMs: 45_000 })
 * gate.registerStep({ name: 'module-graph', run: () => import('./app.js') })
 * const warm = gate.isSettled()
 * const ready = gate.observe(databaseOk && warm)
 * ```
 */
export function createWarmupGate(options: WarmupGateOptions = {}): WarmupGate {
  const defaultTimeoutMs = options.timeoutMs ?? DEFAULT_WARMUP_TIMEOUT_MS
  const requiredPasses = Math.max(1, options.consecutivePasses ?? DEFAULT_CONSECUTIVE_READY_PASSES)
  const now = options.now ?? (() => Date.now())
  const log = options.logger ?? consoleLogger

  const steps = new Map<string, WarmupStep>()
  let settled = false
  let runPromise: Promise<WarmupReport> | null = null
  /**
   * Bumped by {@link WarmupGate.reset}. A pass that started before the reset
   * belongs to a previous process instance and must not settle the new one.
   */
  let generation = 0
  /** Consecutive passing probes seen since the last failure. */
  let streak = 0

  return {
    registerStep: (step: WarmupStep) => {
      steps.set(step.name, step)
      return () => {
        if (steps.get(step.name) === step) steps.delete(step.name)
      }
    },

    run: (extraSteps: WarmupStep[] = [], runOptions: WarmupGateRunOptions = {}) => {
      if (runPromise) return runPromise
      const passGeneration = generation
      const passTimeoutMs = runOptions.timeoutMs ?? defaultTimeoutMs
      const passLog = runOptions.logger ?? log
      const started = now()
      const all = [...steps.values(), ...extraSteps]
      runPromise = Promise.all(all.map((step) => runStep(step, passTimeoutMs, passLog, now))).then(
        (reports) => {
          const report: WarmupReport = {
            ok: reports.every((entry) => entry.ok),
            durationMs: now() - started,
            steps: reports,
          }
          // A reset in the meantime owns the state now.
          if (passGeneration === generation) settled = true
          return report
        },
      )
      return runPromise
    },

    isSettled: () => settled,

    markSettled: () => {
      settled = true
    },

    observe: (passing: boolean) => {
      if (!settled || !passing) {
        streak = 0
        return false
      }
      streak += 1
      return streak >= requiredPasses
    },

    reset: () => {
      settled = false
      runPromise = null
      generation += 1
      streak = 0
    },
  }
}
