/**
 * Discord channel bond for molecule.dev.
 *
 * Implements the {@link ChannelProvider} interface defined by
 * `@molecule/api-channel`, posting outbound messages via Discord's REST
 * API and verifying inbound interaction webhooks against the
 * application's ed25519 public key.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-channel'
 * import { provider } from '@molecule/api-channel-discord'
 *
 * setProvider('discord', provider)
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'

import type { ChannelProvider } from '@molecule/api-channel'

import { createProvider } from './provider.js'

let _provider: ChannelProvider | null = null

/**
 * Lazily-instantiated, default-configured Discord channel provider.
 *
 * The proxy defers construction until first use so importing this module
 * has no side effects (e.g. consuming env vars at import time).
 */
export const provider: ChannelProvider = new Proxy({} as ChannelProvider, {
  get(_target, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
})
