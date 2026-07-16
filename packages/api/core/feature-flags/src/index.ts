/**
 * Feature flags core interface for molecule.dev.
 *
 * Provides the `FeatureFlagProvider` interface for feature flag management
 * including flag evaluation, CRUD operations, rule-based targeting, and
 * percentage rollouts. Bond a concrete provider
 * (e.g. `@molecule/api-feature-flags-database`) at startup via `setProvider()`.
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider, isEnabled, setFlag, evaluateForUser } from '@molecule/api-feature-flags'
 * import { provider } from '@molecule/api-feature-flags-database'
 *
 * // Wire the provider at startup
 * setProvider(provider)
 *
 * // Create a feature flag with percentage rollout
 * await setFlag({ name: 'new-dashboard', enabled: true, percentage: 50 })
 *
 * // Check if a flag is enabled for a user
 * const enabled = await isEnabled('new-dashboard', { userId: 'user-123' })
 *
 * // Evaluate all flags for a user
 * const flags = await evaluateForUser('user-123')
 * ```
 *
 * @remarks
 * - **Percentage/rule targeting only applies when you pass context.**
 *   `isEnabled('new-dashboard')` with NO `{ userId }` falls back to the bare
 *   global toggle — for a percentage flag that means EVERYONE gets it. Always
 *   pass the authenticated user's id for user-facing gating.
 * - **Evaluate flags SERVER-SIDE and ship booleans.** Expose an endpoint that
 *   returns `evaluateForUser(userId)` results for the UI to consume — never
 *   send raw flag definitions/rules to the client or re-implement targeting
 *   there.
 * - **A client-side flag gate is UX, not security.** Anything the flag
 *   protects must also be gated on the API route with the same check.
 * - **Rollouts must be sticky per user.** Evaluate with the same stable
 *   `userId` every time — a session id (or none) makes features flicker
 *   between requests.
 * - `setFlag()` is an upsert keyed on `name`. Flag CRUD (`setFlag`,
 *   `deleteFlag`, `getAllFlags`) is an admin surface — put it behind an admin
 *   authorizer, not a public route.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] A flag actually GATES behavior: with the flag OFF the feature it
 *   guards is hidden/disabled in the UI; flip it ON from the admin screen (or
 *   `setFlag`) and reload — the feature appears with no code change or rebuild.
 *   Turn it back OFF and it disappears again.
 * - [ ] Targeting evaluates PER USER: for a rule- or percentage-flag, a user
 *   inside the segment (matching `attributes`/rollout) sees the feature and a
 *   user outside it does not — verify by signing in as each and via
 *   `isEnabled(flag, { userId, attributes })` / `evaluateForUser(userId)`
 *   returning the right boolean for each. The same user's result is sticky
 *   across reloads, not flickering between requests.
 * - [ ] An UNDEFINED flag (never created) evaluates to the SAFE default:
 *   `isEnabled('does-not-exist', ctx)` returns false and the guarded feature
 *   stays hidden — it does NOT throw or fall open.
 * - [ ] Flag reads are cheap on the hot path — evaluation is server-side and
 *   cached, not a DB round-trip per render — and a toggle propagates promptly
 *   (within a reload / short cache window), not only after a restart.
 * - [ ] The gate is enforced SERVER-SIDE, not just in the UI: calling the API
 *   route the flag protects with the flag OFF is rejected, not merely hidden
 *   (a client-side flag gate is UX, not security).
 * - [ ] ADMIN-ONLY writes: only an authorized admin can create/toggle/delete
 *   flags. A normal signed-in user hitting the flag-CRUD endpoints
 *   (`setFlag`/`deleteFlag`/`getAllFlags`) is rejected — they can't flip a flag
 *   or read raw flag definitions/rules through any exposed route.
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
