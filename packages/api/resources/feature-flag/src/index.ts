/**
 * `@molecule/api-resource-feature-flag` — feature-flag CRUD + targeting
 * rules + environment-scoped rollout state.
 *
 * Extracted from the feature-flag-manager flagship. Flags carry a
 * `key` (e.g. `new-checkout-flow`), a `flag_type` (boolean / multivariate
 * / string / number), an `is_enabled` master switch, a `rollout_percentage`
 * (0-100), and a `state` (on / off / killed / scheduled). Targeting rules
 * attach to a flag and are evaluated in `priority` order.
 *
 * @example
 * ```ts
 * import { createFeatureFlagRouter } from '@molecule/api-resource-feature-flag'
 * app.use('/flags', createFeatureFlagRouter())
 * ```
 *
 * @example
 * ```ts
 * import { listFlagsForUser, createFlagForUser } from '@molecule/api-resource-feature-flag'
 *
 * const flag = await createFlagForUser(userId, {
 *   key: 'new-checkout-flow',
 *   name: 'New checkout flow',
 *   flag_type: 'boolean',
 *   rollout_percentage: 5,
 * })
 * ```
 *
 * @remarks
 * Tables: `src/__setup__/feature_flags.sql` creates `feature_flags` +
 * `feature_flag_targeting_rules`. An mlcl-scaffolded API replays
 * `__setup__/*.sql` automatically on migrate; anywhere else run it once —
 * nothing at runtime creates the tables.
 *
 * Flags are OWNER-SCOPED rows, not app-global config: every service function
 * is `…ForUser(userId, …)` and the router reads the caller from
 * `res.locals.session` (mount it behind your global auth middleware — without
 * a session every request 401s). One user's flags are invisible to another;
 * for team-/app-wide flags, evaluate against a shared owning account or wrap
 * the service with your own scoping.
 *
 * This package STORES flags + targeting rules; it does NOT evaluate them.
 * There is no `/evaluate` endpoint or client SDK — resolve a flag for an end
 * user in your app code: fetch the flag + rules, apply rules in `priority`
 * order, and honor `is_enabled`, `state`, and `rollout_percentage`.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
