/**
 * Health monitoring interface for molecule.dev.
 *
 * Defines MonitoringProvider and SystemHealth interfaces, plus composable
 * factory functions for common health checks (database, cache, HTTP probes,
 * bond registry checks, and custom checks).
 *
 * @example
 * ```typescript
 * import { setProvider, runAll, createDatabaseCheck, createHttpCheck } from '@molecule/api-monitoring'
 * import { provider } from '@molecule/api-monitoring-default'
 *
 * setProvider(provider)
 *
 * const monitoring = getProvider()
 * monitoring.register(createDatabaseCheck())
 * monitoring.register(createHttpCheck('https://api.stripe.com', { name: 'stripe', degradedThresholdMs: 1000 }))
 *
 * const health = await runAll()
 * console.log(health.status) // 'operational' | 'degraded' | 'down'
 * ```
 *
 * @module
 */

export * from './checks.js'
export * from './provider.js'
export * from './types.js'
