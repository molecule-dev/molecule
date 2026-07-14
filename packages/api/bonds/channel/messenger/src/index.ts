/**
 * Facebook Messenger channel provider for molecule.dev.
 *
 * Implements the framework-agnostic {@link ChannelProvider} interface
 * over the Messenger Send API and webhook envelope. Bond under the
 * named-multi-provider `'channel'` category at app startup:
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-channel'
 * import { provider } from '@molecule/api-channel-messenger'
 *
 * setProvider('messenger', provider)
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
