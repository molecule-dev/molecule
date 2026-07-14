/**
 * Fitbit Web API bond for `@molecule/api-wearable`.
 *
 * Implements daily activity, sleep, heart-rate, and weight ingestion
 * against the Fitbit Web API using OAuth 2.0 PKCE with refresh-token
 * rotation. Wires under the `wearable` named-multi-provider category as
 * `'fitbit'`.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-wearable'
 * import { createProvider, PROVIDER_NAME } from '@molecule/api-wearable-fitbit'
 *
 * const fitbit = createProvider({
 *   redirectUri: 'https://app.example.com/auth/fitbit/callback',
 *   credentialsStore: myCredentialsStore,
 *   codeVerifierStore: myVerifierStore,
 * })
 *
 * setProvider(PROVIDER_NAME, fitbit)
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
