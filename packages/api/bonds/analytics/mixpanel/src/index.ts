/**
 * Mixpanel analytics provider for molecule.dev.
 *
 * @example
 * ```typescript
 * import { setProvider, track } from '@molecule/api-analytics'
 * import { provider } from '@molecule/api-analytics-mixpanel'
 *
 * setProvider(provider) // reads MIXPANEL_TOKEN lazily — safe when unset
 * await track({ name: 'purchase.completed', userId: 'u_123' })
 * ```
 *
 * @remarks
 * - Configuration is lazy and failure-safe: importing this package or bonding
 *   `provider` never throws. When MIXPANEL_TOKEN is unset, the bond logs ONE
 *   actionable warning naming the key and analytics calls no-op (resolve) —
 *   telemetry must never crash or 503 real request handlers. If events never
 *   appear in Mixpanel, check the boot log for that warning FIRST.
 * - When configured, events are sent immediately, one HTTP request per call
 *   (no queue), so `flush()` is a no-op — but each call can REJECT on
 *   network/server errors ("Mixpanel Server Error: …") and
 *   `@molecule/api-analytics` propagates those. `.catch()` fire-and-forget
 *   call sites (a bare `void track(...)` turns an outage into an unhandled
 *   rejection).
 * - Server-side calls have no ambient session: pass `userId` (or
 *   `anonymousId`) on `track()` AND `page()` or events are unattributed.
 * - `group()` associates users under a configurable group KEY (Mixpanel's
 *   group-analytics dimension), `'company'` by default. Set the `groupType`
 *   option on `createProvider()` or the `MIXPANEL_GROUP_TYPE` env var to group
 *   by `'workspace'`/`'team'`/etc.; the key must match a group key configured
 *   in Mixpanel → Project Settings.
 * - `timestamp` older than 5 days is rejected by Mixpanel's `/track` ingestion
 *   endpoint — historical backfill needs Mixpanel's import API, not this bond.
 * - The deprecated raw `mixpanel` export throws a tagged `config.notConfigured`
 *   error on first property access when MIXPANEL_TOKEN is unset (a raw client
 *   cannot no-op). Prefer `provider`/`createProvider()`.
 *
 * @see https://www.npmjs.com/package/mixpanel
 *
 * @module
 */

export * from './browser-guard.js'
export * from './mixpanel.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
