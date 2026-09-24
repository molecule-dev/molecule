/**
 * Wearable core interface for molecule.dev (server-side).
 *
 * Defines a stack-neutral, provider-neutral contract for wearable
 * cloud-API bonds (Fitbit, Oura, Withings, Garmin, etc.) consumed by
 * handlers and background sync jobs. Wearable bonds register as a
 * **named multi-provider** — multiple wearable providers may be active
 * for a single user — so wiring uses the named bond API:
 * `bond('wearable', 'fitbit', provider)`.
 *
 * @example
 * ```typescript
 * import type { UserConnection, WearableCredentialsStore } from '@molecule/api-wearable'
 * import { getProvider, listProviders, setProvider } from '@molecule/api-wearable'
 * import { createProvider, PROVIDER_NAME } from '@molecule/api-wearable-fitbit'
 *
 * // YOUR per-user device-token store (use a DB table; encrypt tokens at rest).
 * const connections = new Map<string, UserConnection>()
 * const credentialsStore: WearableCredentialsStore = {
 *   read: async (userId, provider) => connections.get(`${provider}:${userId}`) ?? null,
 *   write: async (provider, conn) => void connections.set(`${provider}:${conn.userId}`, conn),
 *   remove: async (userId, provider) => void connections.delete(`${provider}:${userId}`),
 * }
 *
 * // Startup: register each wearable under its NAME. Env: OAUTH_FITBIT_CLIENT_ID (+ _SECRET).
 * setProvider(
 *   PROVIDER_NAME, // 'fitbit'
 *   createProvider({ redirectUri: 'https://app.example.com/auth/fitbit/callback', credentialsStore }),
 * )
 * // Linking a user's device is the bond's OAuth flow (Fitbit: startAuthorize → connectWithVerifier),
 * // which writes a UserConnection into credentialsStore.
 *
 * // Handler / sync job: read the signed-in user's day from every wearable they connected.
 * const userId = 'user-123' // the AUTHENTICATED user — never an id from the request body
 * const date = '2026-09-23' // YYYY-MM-DD in the user's local calendar
 * for (const name of listProviders()) {
 *   if (!(await credentialsStore.read(userId, name))) continue // not connected to this one
 *   const wearable = getProvider(name)
 *   const activity = await wearable.getDailyActivity(userId, date)
 *   const sleep = await wearable.getDailySleep(userId, date)
 *   const mainSleep = sleep.find((session) => session.isMainSleep)
 *   console.log(name, activity.steps, activity.distanceMeters, mainSleep?.timeAsleepMinutes)
 * }
 * ```
 *
 * @remarks
 * - **Named multi-provider:** `setProvider(name, provider)` / `getProvider(name)` — BOTH take
 *   the provider name first. `getProvider(name)` throws when that name is not bonded;
 *   `getOptionalProvider(name)` returns `null`.
 * - The core does NOT store tokens — you supply the `WearableCredentialsStore`; the bundled
 *   bonds' `getDaily*` calls throw for a user with no stored connection (check `read()` first).
 * - Units are fixed: `distanceMeters` (meters), `weightKg` (kg), sleep in MINUTES, segment
 *   `durationSeconds` in seconds. Dates are `YYYY-MM-DD` strings, not `Date`s.
 * - A day with no data returns zeros for `DailyActivity` — not an error and not "no data".
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview), adapt each item to
 * this app's actual screens/flows, and check every box off one by one. A box you
 * can't check is an integration bug to fix — not a skip. CAVEAT: the device
 * vendor's OAuth consent screen and real sensor data can't be driven in the
 * sandbox, so verify the connection lifecycle + the data mapping/display you own
 * by wiring a stub/test provider (or feeding a sample payload) where the real
 * grant/sync would occur — never mock the app's own handlers or UI:
 * - [ ] Connecting a device from the UI runs the provider's `connect(userId, code)`,
 *   which exchanges the OAuth code and persists a `UserConnection` via the
 *   `WearableCredentialsStore` (`store.write`), keyed by `(userId, providerName)`.
 *   Afterward `store.read(userId, name)` returns that connection and the device
 *   shows "connected"; `disconnect(userId)` removes the record and the UI returns
 *   to the unlinked state.
 * - [ ] Fetching a metric for a real date renders plausible, in-range values in a
 *   chart/summary: `getDailyActivity().steps` in the thousands, `getDailyHeartRate()`
 *   `restingHeartRate` ~40-200 bpm, `getDailySleep()` `timeAsleepMinutes` a sane
 *   number of hours, `getWeight()` `weightKg` a human bodyweight — never
 *   null/NaN/negative.
 * - [ ] Different days/ranges return different data and the dates line up with no
 *   off-by-one/timezone shift: each rollup's `date` (a `YYYY-MM-DD` `WearableDate`)
 *   equals the day requested, and every `getWeight(range)` entry's `date` falls
 *   within `range.start`..`range.end` inclusive.
 * - [ ] A day the device wasn't worn/synced shows as a GAP, not a celebrated zero.
 *   The core zero-defaults `DailyActivity` (a missing day comes back as `steps: 0`,
 *   `activeMinutes: 0`), so the UI must distinguish "no data" from a real 0 and
 *   never present an unsynced day as "0 steps achieved".
 * - [ ] This core is pull-based — the `WearableProvider` interface has no webhook
 *   method; data is read on demand via the `getDaily*`/`getWeight` calls. If a
 *   provider bond wires a sync/subscription callback, delivering a valid callback
 *   updates the stored data and a forged/unsigned callback is rejected.
 * - [ ] PRIVACY/SECURITY — health data is per-user: every `getDaily*`/`getWeight`
 *   call is scoped by the caller's authenticated `userId` and the store is
 *   segregated by `(userId, providerName)`, so no id-guessing reaches another
 *   user's metrics. Device tokens (`accessToken`/`refreshToken`) and provider keys
 *   stay server-side (the package is server-only) and are never logged in the
 *   clear — error paths are sanitized so no token or health data leaks into logs.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
