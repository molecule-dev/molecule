/**
 * Default in-process monitoring provider for molecule.dev.
 *
 * Stores registered checks in memory and runs them in parallel on each
 * runAll() call. No external dependencies. Suitable for all deployment sizes.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-monitoring'
 * import { provider, createProvider } from '@molecule/api-monitoring-default'
 *
 * // Bond the default provider
 * setProvider(provider)
 *
 * // Or create a custom instance with options
 * const customProvider = createProvider({ checkTimeoutMs: 5000 })
 * setProvider(customProvider)
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'

import type { MonitoringProvider } from '@molecule/api-monitoring'

import { createProvider } from './provider.js'

/** Default provider instance (lazy-initialised singleton). */
let _provider: MonitoringProvider | null = null

/**
 * The provider implementation.
 */
export const provider: MonitoringProvider = new Proxy({} as MonitoringProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
})
