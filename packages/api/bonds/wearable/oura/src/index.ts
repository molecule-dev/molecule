/**
 * Oura Cloud API v2 bond for `@molecule/api-wearable`.
 *
 * Implements daily activity, sleep, and heart-rate ingestion against the
 * Oura Cloud API v2 using OAuth 2.0 with refresh-token rotation. Wires
 * under the `wearable` named-multi-provider category as `'oura'`.
 *
 * Oura does not track body weight, so {@link createProvider} returns
 * `[]` from `getWeight()` — pair Oura with another wearable bond
 * (e.g. `@molecule/api-wearable-fitbit` or `-withings`) when weight
 * data is required.
 *
 * @remarks
 * - **`wearable` is a NAMED category:** bond with `setProvider(PROVIDER_NAME, provider)` (the
 *   name is `'oura'`) and read back with `getProvider('oura')` — a one-argument
 *   `setProvider(provider)` does not exist.
 * - **No PKCE and no state store:** `startAuthorize()` is SYNCHRONOUS and only returns a random
 *   `state` — YOU must remember it (session/cookie) and compare it on the callback before
 *   calling `connect(userId, code)`. The bond does not verify `state`.
 * - **Both `OAUTH_OURA_CLIENT_ID` and `OAUTH_OURA_CLIENT_SECRET` are required** (Basic auth on
 *   every token call). They are read lazily — `createProvider()` succeeds without them and the
 *   first OAuth call throws `Oura bond is missing …`. `createProvider()` itself throws only
 *   without `redirectUri` or `credentialsStore`.
 * - `credentialsStore` holds bearer refresh tokens — back it with your database and encrypt at
 *   rest. Tokens refresh transparently (on expiry, and once on a 401) and are written back.
 * - `getWeight()` always resolves `[]` (Oura has no weight data). `connect()` stores an EMPTY
 *   `providerAccountId`. `getDailyHeartRate()` buckets the day in UTC. Dates are `YYYY-MM-DD`;
 *   `distanceMeters` is Oura's equivalent walking distance, `activeMinutes` is minutes.
 *
 * @example
 * ```typescript
 * import type { UserConnection, WearableCredentialsStore } from '@molecule/api-wearable'
 * import { getProvider, setProvider } from '@molecule/api-wearable'
 * import { createProvider, PROVIDER_NAME } from '@molecule/api-wearable-oura'
 *
 * // In-memory for brevity — back this with your database (encrypt tokens at rest).
 * const connections = new Map<string, UserConnection>()
 * const credentialsStore: WearableCredentialsStore = {
 *   read: async (userId, provider) => connections.get(`${provider}:${userId}`) ?? null,
 *   write: async (provider, conn) => void connections.set(`${provider}:${conn.userId}`, conn),
 *   remove: async (userId, provider) => void connections.delete(`${provider}:${userId}`),
 * }
 *
 * // Startup. Env: OAUTH_OURA_CLIENT_ID and OAUTH_OURA_CLIENT_SECRET (both required).
 * const oura = createProvider({
 *   redirectUri: 'https://app.example.com/auth/oura/callback', // registered with Oura
 *   credentialsStore,
 * })
 * setProvider(PROVIDER_NAME, oura) // named category: 'oura'
 *
 * // 1. "Connect Oura" route: remember `state` in the user's session, redirect to `url`.
 * const { url, state } = oura.startAuthorize() // synchronous
 *
 * // 2. Callback route (?code=…&state=…): YOU verify state, then exchange the code.
 * const callback = { code: 'code-from-the-callback-query', state }
 * if (callback.state === state) await oura.connect('user-123', callback.code)
 *
 * // 3. Anywhere later, through the core (tokens refresh automatically):
 * const activity = await getProvider('oura').getDailyActivity('user-123', '2026-09-23')
 * // { date: '2026-09-23', steps: 9120, distanceMeters: 7040, caloriesOut: 2450, activeMinutes: 95 }
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
