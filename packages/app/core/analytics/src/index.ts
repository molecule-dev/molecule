/**
 * Frontend analytics interface for molecule.dev.
 *
 * Provides a unified analytics API that can be backed by different
 * implementations (PostHog, Mixpanel, etc.).
 *
 * @example
 * ```typescript
 * import { identify, reset, setProvider, track } from '@molecule/app-analytics'
 * import { createProvider } from '@molecule/app-analytics-posthog'
 *
 * // At startup — the key comes from your build-time env (in Vite:
 * // import.meta.env.VITE_POSTHOG_KEY); a missing key yields a warning +
 * // no-op provider, never a crash.
 * setProvider(createProvider({ apiKey: posthogApiKey }))
 *
 * identify({ userId: user.id, email: user.email })      // on login
 * track({ name: 'order_placed', properties: { total } })
 * reset()                                               // on logout
 * ```
 *
 * @remarks
 * - Every convenience function (`track`, `identify`, `page`, …) swallows
 *   provider errors and no-ops when nothing is bonded — analytics can never
 *   break the UI, so `hasProvider()` is the ONLY signal that separates
 *   "analytics disabled/unbonded" from "events are being tracked". Check it
 *   (and the bond's own console warning) before debugging tracking code.
 * - Attribution is AMBIENT in the browser: call `identify(user)` on login and
 *   `reset()` on logout; per-event `userId`/`anonymousId` fields are not
 *   honored by browser bonds (they exist for parity with
 *   `@molecule/api-analytics`).
 * - `group(groupId)` normalizes the group TYPE to `'company'` in every bond
 *   (Mixpanel group key, PostHog group type) — look under "company" in the
 *   provider's UI.
 *
 * @module
 */

export * from './auto-tracking.js'
export * from './provider.js'
export * from './types.js'
