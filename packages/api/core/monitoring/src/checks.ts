/**
 * Built-in health check factory functions.
 *
 * All factories return HealthCheck objects that can be registered with any
 * MonitoringProvider. They use isBonded() from \@molecule/api-bond to remain
 * fully decoupled from concrete provider implementations.
 *
 * @module
 */

import { get as bondGet, isBonded } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { CheckResult, HealthCheck } from './types.js'

/**
 * Options for createHttpCheck.
 */
export interface HttpCheckOptions {
  /** Check name. Defaults to the URL hostname. */
  name?: string
  /** Check category. Defaults to 'external'. */
  category?: string
  /** Request timeout in milliseconds. Defaults to 5000. */
  timeoutMs?: number
  /** Expected HTTP status code range. Defaults to 200-299. */
  expectedStatus?: number
  /** Latency threshold in ms above which status degrades to 'degraded'. */
  degradedThresholdMs?: number
}

/**
 * Creates a health check that probes the database bond.
 *
 * Uses the 'database' bond type via isBonded()/get(). Sends a lightweight
 * query (SELECT 1) to confirm connectivity.
 *
 * @param name - Check name. Defaults to 'database'.
 * @param category - Check category. Defaults to 'infrastructure'.
 * @returns A HealthCheck that probes the database bond.
 */
export const createDatabaseCheck = (
  name = 'database',
  category = 'infrastructure',
): HealthCheck => ({
  name,
  category,
  async check(): Promise<CheckResult> {
    if (!isBonded('database')) {
      return {
        status: 'down',
        message: t('monitoring.check.database.notBonded', undefined, {
          defaultValue: 'Database bond not configured.',
        }),
      }
    }

    const pool = bondGet<{ query: (sql: string) => Promise<unknown> }>('database')
    if (!pool) {
      return {
        status: 'down',
        message: t('monitoring.check.database.poolUnavailable', undefined, {
          defaultValue: 'Database pool unavailable.',
        }),
      }
    }

    const start = Date.now()
    try {
      await pool.query('SELECT 1')
      return { status: 'operational', latencyMs: Date.now() - start }
    } catch (error) {
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        message: error instanceof Error ? error.message : String(error),
      }
    }
  },
})

/**
 * Creates a health check that probes the cache bond.
 *
 * Attempts a set/get/delete round-trip on a sentinel key to confirm the
 * cache is operational.
 *
 * @param name - Check name. Defaults to 'cache'.
 * @param category - Check category. Defaults to 'infrastructure'.
 * @returns A HealthCheck that probes the cache bond.
 */
export const createCacheCheck = (name = 'cache', category = 'infrastructure'): HealthCheck => ({
  name,
  category,
  async check(): Promise<CheckResult> {
    if (!isBonded('cache')) {
      return {
        status: 'down',
        message: t('monitoring.check.cache.notBonded', undefined, {
          defaultValue: 'Cache bond not configured.',
        }),
      }
    }

    const cache = bondGet<{
      set: (k: string, v: unknown, opts?: { ttl?: number }) => Promise<void>
      get: (k: string) => Promise<unknown>
      delete: (k: string) => Promise<boolean>
    }>('cache')

    if (!cache) {
      return {
        status: 'down',
        message: t('monitoring.check.cache.providerUnavailable', undefined, {
          defaultValue: 'Cache provider unavailable.',
        }),
      }
    }

    const key = '__molecule_health_check__'
    const start = Date.now()
    try {
      await cache.set(key, 1, { ttl: 5 })
      await cache.get(key)
      await cache.delete(key)
      return { status: 'operational', latencyMs: Date.now() - start }
    } catch (error) {
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        message: error instanceof Error ? error.message : String(error),
      }
    }
  },
})

/**
 * Creates a health check that performs an HTTP GET probe against a URL.
 *
 * Uses the global fetch API (Node 18+). Reports 'degraded' if the response
 * time exceeds degradedThresholdMs, 'down' if the request fails or the
 * response status is unexpected.
 *
 * @param url - The URL to probe.
 * @param options - Optional configuration.
 * @returns A HealthCheck that performs an HTTP GET probe.
 */
export const createHttpCheck = (url: string, options?: HttpCheckOptions): HealthCheck => {
  const parsed = new URL(url)
  return {
    name: options?.name ?? parsed.hostname,
    category: options?.category ?? 'external',
    async check(): Promise<CheckResult> {
      const controller = new AbortController()
      const timeoutMs = options?.timeoutMs ?? 5000
      const timer = setTimeout(() => controller.abort(), timeoutMs)

      const start = Date.now()
      try {
        const response = await fetch(url, { method: 'GET', signal: controller.signal })
        const latencyMs = Date.now() - start
        clearTimeout(timer)

        const expectedStatus = options?.expectedStatus
        const isStatusOk = expectedStatus
          ? response.status === expectedStatus
          : response.status >= 200 && response.status < 300

        if (!isStatusOk) {
          return {
            status: 'down',
            latencyMs,
            message: t(
              'monitoring.check.http.badStatus',
              { status: response.status },
              {
                defaultValue: 'HTTP {{status}} response.',
              },
            ),
          }
        }

        const degraded = options?.degradedThresholdMs
        if (degraded && latencyMs > degraded) {
          return {
            status: 'degraded',
            latencyMs,
            message: t(
              'monitoring.check.http.degraded',
              { latencyMs, thresholdMs: degraded },
              {
                defaultValue: 'Response time {{latencyMs}}ms exceeded threshold {{thresholdMs}}ms.',
              },
            ),
          }
        }

        return { status: 'operational', latencyMs }
      } catch (error) {
        clearTimeout(timer)
        const latencyMs = Date.now() - start
        const isAbort = error instanceof Error && error.name === 'AbortError'
        return {
          status: 'down',
          latencyMs,
          message: isAbort
            ? t('monitoring.check.http.timeout', undefined, {
                defaultValue: 'Request timed out.',
              })
            : error instanceof Error
              ? error.message
              : String(error),
        }
      }
    },
  }
}

/**
 * Creates a health check that verifies a bond is registered.
 *
 * Purely synchronous registry introspection — no provider methods called.
 *
 * @param bondType - The bond type string to check (e.g. 'database', 'email').
 * @param name - Check name. Defaults to `bond:{bondType}`.
 * @param category - Check category. Defaults to 'bonds'.
 * @returns A HealthCheck that verifies the bond is registered.
 */
export const createBondCheck = (
  bondType: string,
  name?: string,
  category = 'bonds',
): HealthCheck => ({
  name: name ?? `bond:${bondType}`,
  category,
  async check(): Promise<CheckResult> {
    if (isBonded(bondType)) {
      return { status: 'operational' }
    }
    return {
      status: 'down',
      message: t(
        'monitoring.check.bond.notBonded',
        { bondType },
        {
          defaultValue: "Bond '{{bondType}}' is not registered.",
        },
      ),
    }
  },
})

/**
 * Creates a custom health check from a user-provided async function.
 *
 * @param name - Unique check name.
 * @param fn - Async function returning a CheckResult.
 * @param category - Check category. Defaults to 'custom'.
 * @returns A HealthCheck wrapping the user-provided function.
 */
export const createCustomCheck = (
  name: string,
  fn: () => Promise<CheckResult>,
  category = 'custom',
): HealthCheck => ({
  name,
  category,
  check: fn,
})
