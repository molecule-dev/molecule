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
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
