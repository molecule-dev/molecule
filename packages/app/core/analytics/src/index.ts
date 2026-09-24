/**
 * Frontend analytics interface for molecule.dev.
 *
 * Provides a unified analytics API that can be backed by different
 * implementations (PostHog, Mixpanel, etc.).
 *
 * @example
 * ```typescript
 * import { hasProvider, identify, page, reset, setProvider, track } from '@molecule/app-analytics'
 * import { createProvider } from '@molecule/app-analytics-posthog'
 *
 * // Startup: in a Vite app the key is `import.meta.env.VITE_POSTHOG_KEY`. A missing key
 * // yields a console warning + no-op provider, never a crash.
 * const apiKey = 'phc_your_project_key'
 * setProvider(createProvider({ apiKey }))
 * console.log(hasProvider()) // true — the ONLY sign events are really being sent
 *
 * const user = { id: 'u_123', email: 'ada@example.com', name: 'Ada' }
 * await identify({ userId: user.id, email: user.email, name: user.name }) // on login
 * await page({ path: '/checkout', name: 'Checkout' })
 * await track({ name: 'order_placed', properties: { total: 42.5, currency: 'USD' } })
 * await reset() // on logout
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
