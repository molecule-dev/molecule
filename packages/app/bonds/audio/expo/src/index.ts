/**
 * Expo audio playback provider for molecule.dev.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/app-audio'
 * import { provider } from '@molecule/app-audio-expo'
 *
 * setProvider(provider)
 * ```
 *
 * @remarks
 * The `expo-audio` peer is pinned to the version bundled with Expo SDK 53.
 * A bare React Native app needs Expo modules installed before it can use this provider.
 * Destroy each player when it is no longer needed to release its native resources.
 * For multiple source URLs, Expo tries them in order. A source that fails or
 * takes over ten seconds to load gives the next URL a chance.
 *
 * @module
 */

export * from './provider.js'
