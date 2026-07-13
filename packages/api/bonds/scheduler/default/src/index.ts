/**
 * Default in-process scheduler provider for molecule.dev.
 *
 * Uses setInterval for periodic task execution with staggered startup
 * to prevent thundering herd.
 *
 * @example
 * ```typescript
 * import { schedule, setProvider, start } from '@molecule/api-scheduler'
 * import { provider } from '@molecule/api-scheduler-default'
 *
 * setProvider(provider)
 *
 * schedule({
 *   name: 'cleanup',
 *   intervalMs: 60000,
 *   async handler() {
 *     // ...
 *   },
 * })
 *
 * // REQUIRED: nothing runs until start() — scheduling alone does not execute
 * // tasks. Tasks scheduled after start() begin automatically (staggered).
 * start()
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
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
