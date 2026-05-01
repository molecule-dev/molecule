/**
 * Telegram channel provider for molecule.dev.
 *
 * Implements the framework-agnostic {@link ChannelProvider} interface
 * over the Telegram Bot API. Bond under the named-multi-provider
 * `'channel'` category at app startup:
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-channel'
 * import { provider } from '@molecule/api-channel-telegram'
 *
 * setProvider('telegram', provider)
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
