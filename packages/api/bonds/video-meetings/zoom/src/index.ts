/**
 * Zoom video meetings provider for molecule.dev.
 *
 * Implements the `@molecule/api-video-meetings` interface using the Zoom
 * REST v2 API.
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-video-meetings'
 * import { createProvider } from '@molecule/api-video-meetings-zoom'
 *
 * // Server-to-Server OAuth (reads ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID,
 * // ZOOM_CLIENT_SECRET from the environment by default).
 * setProvider(createProvider())
 *
 * // Or per-request user OAuth tokens.
 * setProvider(createProvider({
 *   accessToken: () => readUserOAuthToken(),
 * }))
 * ```
 */

export * from './provider.js'
export * from './types.js'
