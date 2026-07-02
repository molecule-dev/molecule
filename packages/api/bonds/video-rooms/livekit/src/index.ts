/**
 * LiveKit video rooms provider for molecule.dev.
 *
 * Implements the `@molecule/api-video-rooms` interface against the
 * LiveKit Server API (Twirp transport) and the `livekit-server-sdk`
 * `AccessToken` HS256 JWT signer. Self-hostable + LiveKit Cloud — the
 * recommended provider for users who need to keep media on their own
 * infrastructure.
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-video-rooms'
 * import { createProvider } from '@molecule/api-video-rooms-livekit'
 *
 * // Bond at startup (reads LIVEKIT_URL / LIVEKIT_API_KEY /
 * // LIVEKIT_API_SECRET by default)
 * setProvider(createProvider())
 *
 * // Or with explicit config
 * setProvider(createProvider({
 *   host: 'https://livekit.example.com',
 *   apiKey: 'APIxxx',
 *   apiSecret: 'secretxxx',
 * }))
 * ```
 */

export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
