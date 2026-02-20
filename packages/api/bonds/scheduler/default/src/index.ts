/**
 * Default in-process scheduler provider for molecule.dev.
 *
 * Uses setInterval for periodic task execution with staggered startup
 * to prevent thundering herd.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-scheduler'
 * import { provider } from '@molecule/api-scheduler-default'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'

import type { SchedulerProvider } from '@molecule/api-scheduler'

import { createProvider } from './provider.js'

let _provider: SchedulerProvider | null = null

/**
 * The provider implementation.
 */
export const provider: SchedulerProvider = new Proxy({} as SchedulerProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
})
