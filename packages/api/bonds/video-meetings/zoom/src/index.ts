/**
 * Zoom video meetings provider for molecule.dev.
 *
 * Implements the `@molecule/api-video-meetings` interface using the Zoom
 * REST v2 API.
 *
 * @remarks
 * `createProvider()` validates credentials EAGERLY: without an `accessToken`
 * resolver, any missing ZOOM_ACCOUNT_ID / ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET
 * throws at bond time — an app wiring `setProvider(createProvider())` at
 * startup will not boot until the secrets are set (unlike the sms bonds,
 * which defer validation to first send). Requires a Zoom "Server-to-Server
 * OAuth" app type for the env-credentials mode.
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

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
