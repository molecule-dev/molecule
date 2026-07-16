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
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one by
 * one. This is HEALTH data: a box you can't check is a correctness or privacy
 * bug to fix, never a skip:
 * - [ ] Adding a medication persists its real fields — `name`, `dosage`,
 *   `frequency`, `times_of_day` — and the med then appears in the user's list
 *   (`GET /`) carrying those exact values, not a truncated or defaulted copy.
 * - [ ] The schedule matches the frequency: a `twice_daily` med carries two
 *   `times_of_day` entries and the UI shows two dose slots for the day — not one
 *   and not three; a `daily` med shows exactly one. (Nothing derives the times
 *   from `frequency` automatically, so a mismatch is a real bug to catch here.)
 * - [ ] Logging a dose records it against the right medication and time:
 *   `POST /:id/logs` with `status: 'taken'` (and its `taken_at`) then shows in
 *   `GET /:id/logs`, and the adherence figure (`GET /adherence`) moves.
 * - [ ] A skipped or missed dose is reflected HONESTLY — logged with
 *   `status: 'missed'`/`'skipped'` it counts toward `total` but NOT `taken`, so
 *   it lowers the adherence rate; it is never silently counted as taken (the
 *   default status is `taken`, so a miss must be logged as a miss, not omitted).
 * - [ ] CORRECTNESS — adherence is a true ratio of logged doses: a brand-new
 *   med with zero logged doses reads 0% (`rate` 0, `total` 0), never 100%; a
 *   partial day (some doses logged, some not yet) is never shown as complete.
 * - [ ] If the app tracks refills/supply on top of this resource (the core does
 *   not model one), recording a fill decrements the refills-remaining count and
 *   a low-supply threshold raises a visible refill flag — verify both live.
 * - [ ] PRIVACY/AUTHORIZATION — medication data is strictly per-user: signed in
 *   as user B, guessing user A's medication id on `GET /:id`, `PUT /:id`,
 *   `DELETE /:id`, or `/:id/logs` returns 404 (owner-scoped), never A's row; an
 *   unauthenticated request 401s. Confirm PHI (name, dosage, notes) is never
 *   written to server logs in the clear.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
