/**
 * Fitbit Web API bond for `@molecule/api-wearable`.
 *
 * Implements daily activity, sleep, heart-rate, and weight ingestion
 * against the Fitbit Web API using OAuth 2.0 PKCE with refresh-token
 * rotation. Wires under the `wearable` named-multi-provider category as
 * `'fitbit'`.
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
 * - **`wearable` is a NAMED category:** bond with `setProvider(PROVIDER_NAME, provider)` (the
 *   name is `'fitbit'`) and read back with `getProvider('fitbit')` — a one-argument
 *   `setProvider(provider)` does not exist.
 * - **You supply the storage:** `credentialsStore` (required — `createProvider()` throws
 *   without it or without `redirectUri`) holds bearer refresh tokens, so back it with your
 *   database and encrypt at rest. `codeVerifierStore` is needed only for `startAuthorize()`
 *   / `connect()`.
 * - `OAUTH_FITBIT_CLIENT_ID` is read lazily (first OAuth call), not at `createProvider()`;
 *   a missing id throws then. `OAUTH_FITBIT_CLIENT_SECRET` is optional (PKCE-only clients).
 * - Dates are `YYYY-MM-DD` strings in the user's Fitbit timezone; results are metric
 *   (`distanceMeters` in meters, weight in kg). A data call for a user who never connected
 *   throws `Fitbit connection not found for user '<id>'`.
 *
 * @example
 * ```typescript
 * import type { UserConnection, WearableCredentialsStore } from '@molecule/api-wearable'
 * import { getProvider, setProvider } from '@molecule/api-wearable'
 * import type { FitbitCodeVerifierStore } from '@molecule/api-wearable-fitbit'
 * import { createProvider, PROVIDER_NAME } from '@molecule/api-wearable-fitbit'
 *
 * // In-memory for brevity — back both stores with your database (encrypt tokens at rest).
 * const connections = new Map<string, UserConnection>()
 * const credentialsStore: WearableCredentialsStore = {
 *   read: async (userId, provider) => connections.get(`${provider}:${userId}`) ?? null,
 *   write: async (provider, conn) => void connections.set(`${provider}:${conn.userId}`, conn),
 *   remove: async (userId, provider) => void connections.delete(`${provider}:${userId}`),
 * }
 * const verifiers = new Map<string, string>()
 * const codeVerifierStore: FitbitCodeVerifierStore = {
 *   put: async (state, verifier) => void verifiers.set(state, verifier),
 *   take: async (state) => {
 *     const verifier = verifiers.get(state) ?? null
 *     verifiers.delete(state) // single use
 *     return verifier
 *   },
 * }
 *
 * // Startup. Env: OAUTH_FITBIT_CLIENT_ID (+ OAUTH_FITBIT_CLIENT_SECRET for confidential apps).
 * const fitbit = createProvider({
 *   redirectUri: 'https://app.example.com/auth/fitbit/callback', // registered with Fitbit
 *   credentialsStore,
 *   codeVerifierStore,
 * })
 * setProvider(PROVIDER_NAME, fitbit) // named category: 'fitbit'
 *
 * // 1. "Connect Fitbit" route: redirect the signed-in user to `url`.
 * const { url, state } = await fitbit.startAuthorize()
 *
 * // 2. Callback route (?code=…&state=…): check `state`, take its verifier, exchange the code.
 * const code = 'code-from-the-callback-query'
 * const verifier = await codeVerifierStore.take(state)
 * if (verifier) await fitbit.connectWithVerifier('user-123', code, verifier)
 *
 * // 3. Anywhere later, through the core (tokens refresh automatically):
 * const activity = await getProvider('fitbit').getDailyActivity('user-123', '2026-09-23')
 * // { date: '2026-09-23', steps: 8432, distanceMeters: 6120, caloriesOut: 2310, activeMinutes: 54, … }
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
