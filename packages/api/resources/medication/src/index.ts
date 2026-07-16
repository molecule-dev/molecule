/**
 * `@molecule/api-resource-medication` — medication tracking with
 * dosing schedule + adherence log + adherence-rate calc.
 *
 * Owner-scoped: every medication and dose log belongs to the authenticated
 * user. Medications carry dosage, `frequency` (e.g. `daily`, `twice_daily`),
 * `times_of_day`, and active date range; dose logs record
 * taken/skipped/late/missed and `adherenceRate` aggregates them over a date
 * range.
 *
 * @example
 * ```ts
 * import { createMedicationRouter } from '@molecule/api-resource-medication'
 * app.use('/medications', createMedicationRouter())
 * // GET / · POST / · GET /adherence?from=…&to=… · GET|PUT|DELETE /:id
 * // GET /:id/logs · POST /:id/logs
 * ```
 *
 * @example
 * ```ts
 * import {
 *   adherenceRate,
 *   createMedicationForOwner,
 *   logDose,
 * } from '@molecule/api-resource-medication'
 *
 * const med = await createMedicationForOwner(userId, {
 *   name: 'Metformin',
 *   dosage: '500 mg',
 *   frequency: 'twice_daily',
 * })
 * await logDose(med.id, userId, { status: 'taken' })
 * const { rate } = await adherenceRate(userId, '2026-01-01', '2026-01-31')
 * ```
 *
 * @remarks
 * Tables: `src/__setup__/medications.sql` creates `medications` +
 * `medication_logs`. An mlcl-scaffolded API replays `__setup__/*.sql`
 * automatically on migrate; anywhere else run it once — nothing at runtime
 * creates them.
 *
 * The router does not authenticate — it reads the caller from
 * `res.locals.session` (populated by your global auth middleware) and 401s
 * without a session. All service functions are `…ForOwner(…, ownerId)` and
 * return `null` for rows the caller doesn't own — always pass the
 * AUTHENTICATED user's id, never a client-sent one.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
