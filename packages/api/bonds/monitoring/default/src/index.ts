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
 * @remarks
 * - **`runAll()` never rejects.** A check that THROWS (easy with
 *   `createCustomCheck`) becomes a `'down'` entry carrying the thrown message;
 *   a check that exceeds `checkTimeoutMs` (default 10000) becomes a `'down'`
 *   entry with `Check timed out after {ms}ms.` — so callers can tell a hung
 *   dependency from a failing one, and one bad check never turns the whole
 *   /health endpoint into an opaque 500.
 * - The overall `status` is the worst individual status
 *   (`down` > `degraded` > `operational`); an empty registry reports
 *   `operational`.
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
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
