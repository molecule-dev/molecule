/**
 * Webhook notifications provider for molecule.dev.
 *
 * Sends notifications as HTTP POST requests with optional HMAC signing.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-notifications'
 * import { provider } from '@molecule/api-notifications-webhook'
 *
 * setProvider('webhook', provider)
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'

import type { NotificationsProvider } from '@molecule/api-notifications'

import { createProvider } from './provider.js'

let _provider: NotificationsProvider | null = null

/**
 * The provider implementation.
 */
export const provider: NotificationsProvider = new Proxy({} as NotificationsProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
})
