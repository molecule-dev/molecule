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
 * import express from 'express'
 *
 * import { setStore } from '@molecule/api-database'
 * import { store } from '@molecule/api-database-postgresql'
 * import {
 *   createFeatureFlagRouter,
 *   createFlagForUser,
 *   updateFlagForUser,
 * } from '@molecule/api-resource-feature-flag'
 *
 * // Startup: bond the DataStore once (the postgresql bond reads DATABASE_URL), then mount the
 * // router AFTER the global auth middleware that sets res.locals.session (else every call 401s).
 * setStore(store)
 * const app = express()
 * app.use(express.json())
 * app.use('/flags', createFeatureFlagRouter()) // GET/POST /flags, GET/PUT/DELETE /flags/:id, /:id/rules
 *
 * // Server-side equivalent of POST /flags then PUT /flags/:id, as the SESSION user:
 * const userId = 'user-123'
 * const flag = await createFlagForUser(userId, {
 *   key: 'new-checkout-flow',
 *   name: 'New checkout flow',
 *   flag_type: 'boolean',
 *   rollout_percentage: 5, // integer percent 0–100
 * })
 * // A new flag is created OFF (`is_enabled: false`, `state: 'off'`) — turn it on explicitly.
 * const live = await updateFlagForUser(flag.id, userId, { is_enabled: true, state: 'on' })
 * console.log(live?.state) // 'on'
 * ```
 *
 * @remarks
 * **Bond the DataStore first** (`setStore(...)` from `@molecule/api-database`).
 * New flags are created DISABLED (`is_enabled: false`, `state: 'off'`, and
 * `rollout_percentage: 0` unless given) — enable them with `updateFlagForUser` /
 * `PUT /flags/:id`. `GET /flags` paginates by `page` (1-based) + `limit`, not
 * `offset`, and returns `{ data, total, page, limit }`.
 *
 * To EVALUATE flags at runtime (percentage rollout, targeting) use the separate
 * core `@molecule/api-feature-flags` with a provider bond — this resource is a
 * per-user flag CRUD store only.
 *
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
