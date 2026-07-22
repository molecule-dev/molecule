/**
 * Default in-process monitoring provider.
 *
 * Stores all registered checks in memory. runAll() executes them in parallel
 * with per-check timeout wrapping. Overall status is the worst status across
 * all checks (down > degraded > operational).
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'
import type {
  CheckEntry,
  CheckResult,
  CheckStatus,
  HealthCheck,
  MonitoringProvider,
  SystemHealth,
} from '@molecule/api-monitoring'

import type { DefaultMonitoringOptions } from './types.js'

/** Status ranking — higher number = worse. */
const STATUS_RANK: Record<CheckStatus, number> = {
  operational: 0,
  degraded: 1,
  down: 2,
}

/**
 * Computes the aggregate worst status from an array of individual statuses.
 * @param statuses - Array of individual check statuses to aggregate.
 * @returns The worst status across all entries.
 */
const worstStatus = (statuses: CheckStatus[]): CheckStatus => {
  if (statuses.length === 0) return 'operational'
  return statuses.reduce((worst, s) => (STATUS_RANK[s] > STATUS_RANK[worst] ? s : worst))
}

/**
 * Wraps a check's Promise with a per-check timeout.
 *
 * The timer is cleared as soon as the race settles — a lingering timer would
 * keep the process event loop alive for up to `ms` (10s by default) after
 * every `runAll()`, stalling short-lived scripts and test runners.
 *
 * @param promise - The check promise to wrap.
 * @param ms - Timeout duration in milliseconds.
 * @returns A Promise that resolves to a 'down' result if the timeout fires first.
 */
const withTimeout = (promise: Promise<CheckResult>, ms: number): Promise<CheckResult> => {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<CheckResult>((resolve) => {
    timer = setTimeout(
      () =>
        resolve({
          status: 'down',
          message: t(
            'monitoring.check.timedOut',
            { timeoutMs: ms },
            {
              defaultValue: 'Check timed out after {{timeoutMs}}ms.',
            },
          ),
        }),
      ms,
    )
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

/**
 * Creates a default in-process monitoring provider.
 *
 * @param options - Configuration options.
 * @returns A MonitoringProvider implementation.
 */
export const createProvider = (options?: DefaultMonitoringOptions): MonitoringProvider => {
  const checkTimeoutMs = options?.checkTimeoutMs ?? 10000
  const checks = new Map<string, HealthCheck>()
  const logger = getLogger()
  let latest: SystemHealth | null = null

  return {
    register(check: HealthCheck): void {
      checks.set(check.name, check)
    },

    deregister(name: string): boolean {
      return checks.delete(name)
    },

    async runAll(): Promise<SystemHealth> {
      const entries = Array.from(checks.values())
      const now = new Date().toISOString()

      const results = await Promise.all(
        entries.map(async (check): Promise<CheckEntry> => {
          const checkedAt = new Date().toISOString()
          // Time every check at the provider level: the built-in checks
          // self-report `latencyMs`, but a custom check that doesn't would
          // otherwise surface in /status with no latency at all — inconsistent
          // telemetry for the one field a latency regression shows up in.
          const started = Date.now()
          let result: CheckResult
          try {
            result = await withTimeout(check.check(), checkTimeoutMs)
          } catch (error) {
            // A throwing check (easy with createCustomCheck) is THAT check's
            // failure, not the snapshot's: report it as 'down' with the thrown
            // message instead of rejecting runAll() — one bad check must not
            // turn the whole /health endpoint into an opaque 500.
            result = {
              status: 'down',
              message: error instanceof Error ? error.message : String(error),
            }
          }
          return {
            name: check.name,
            category: check.category,
            checkedAt,
            ...result,
            latencyMs: result.latencyMs ?? Date.now() - started,
          }
        }),
      )

      const checksMap: Record<string, CheckEntry> = {}
      for (const entry of results) {
        checksMap[entry.name] = entry
      }

      // Compare against the PREVIOUS snapshot (captured before `latest` is
      // overwritten below) so only a status TRANSITION logs at warn. Without
      // this, a /health endpoint polled every 10s with one down dependency
      // emits ~360 identical warn lines/hour — noise that buries the
      // transition that actually matters. A steady-state repeat of an
      // already-reported down/degraded check still logs, at debug.
      const previousChecks = latest?.checks
      for (const entry of results) {
        const previousStatus = previousChecks?.[entry.name]?.status
        const transitioned = previousStatus !== entry.status

        if (entry.status === 'down' || entry.status === 'degraded') {
          const detail = `Health check '${entry.name}' is ${entry.status}: ${entry.message ?? 'no details'}`
          if (transitioned) {
            logger.warn(detail)
          } else {
            logger.debug(detail)
          }
        } else if (transitioned && previousStatus !== undefined) {
          // Recovered from a down/degraded state — as notable to anyone
          // triaging from logs alone as the original failure was.
          logger.info(
            `Health check '${entry.name}' recovered (was ${previousStatus}, now operational)`,
          )
        }
      }

      const overall = worstStatus(results.map((r) => r.status))

      latest = {
        status: overall,
        checks: checksMap,
        timestamp: now,
      }

      logger.debug(`Health checks completed: ${overall} (${results.length} checks)`)

      return latest
    },

    getLatest(): SystemHealth | null {
      return latest
    },

    getRegisteredChecks(): string[] {
      return Array.from(checks.keys())
    },
  }
}
