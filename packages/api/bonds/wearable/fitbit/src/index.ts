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
 * @remarks
 * **OAuth callback contract for `connect(userId, code)`:** `startAuthorize()`
 * stores the PKCE verifier under the returned `state`, but `connect()` looks
 * it up by the authorization `code`. Your callback handler must bridge the
 * two: validate `state`, `take(state)` the verifier, `put(code, verifier)`
 * it back, then call `connect(userId, code)` — or skip the store entirely
 * and call `connectWithVerifier(userId, code, verifier)`. Calling `connect()`
 * without the re-put fails with 'no PKCE verifier found for supplied code'.
 *
 * Tokens refresh transparently (proactively on expiry, once on 401) and are
 * written back to the credentials store before any call returns.
 * `disconnect()` always removes the local record even if Fitbit's revoke
 * call fails.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
