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
 * @param promise - The check promise to wrap.
 * @param ms - Timeout duration in milliseconds.
 * @returns A Promise that resolves to a 'down' result if the timeout fires first.
 */
const withTimeout = (promise: Promise<CheckResult>, ms: number): Promise<CheckResult> => {
  const timeout = new Promise<CheckResult>((resolve) =>
    setTimeout(
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
    ),
  )
  return Promise.race([promise, timeout])
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
          const result = await withTimeout(check.check(), checkTimeoutMs)
          return {
            name: check.name,
            category: check.category,
            checkedAt,
            ...result,
          }
        }),
      )

      const checksMap: Record<string, CheckEntry> = {}
      for (const entry of results) {
        checksMap[entry.name] = entry
      }

      for (const entry of results) {
        if (entry.status === 'down') {
          logger.warn(`Health check '${entry.name}' is down: ${entry.message ?? 'no details'}`)
        } else if (entry.status === 'degraded') {
          logger.warn(`Health check '${entry.name}' is degraded: ${entry.message ?? 'no details'}`)
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
