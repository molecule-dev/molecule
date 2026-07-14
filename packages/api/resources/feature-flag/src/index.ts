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
 * Run `src/__setup__/feature_flags.sql` once to create the
 * `feature_flags` + `feature_flag_targeting_rules` tables.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
