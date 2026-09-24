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
 * ```typescript
 * import express from 'express'
 *
 * import { setStore } from '@molecule/api-database'
 * import { store } from '@molecule/api-database-postgresql'
 * import {
 *   adherenceRate,
 *   createMedicationForOwner,
 *   createMedicationRouter,
 *   logDose,
 * } from '@molecule/api-resource-medication'
 *
 * // Startup: bond the DataStore once (the postgresql bond reads DATABASE_URL), then mount the
 * // router AFTER the global auth middleware that sets res.locals.session (else every call 401s).
 * setStore(store)
 * const app = express()
 * app.use(express.json())
 * app.use('/medications', createMedicationRouter())
 * // GET / · POST / · GET /adherence?from=…&to=… · GET|PUT|DELETE /:id · GET|POST /:id/logs
 *
 * // Server-side equivalent of POST /medications then POST /medications/:id/logs:
 * const userId = 'user-123' // the SESSION user — never a client-sent id
 * const med = await createMedicationForOwner(userId, {
 *   name: 'Metformin',
 *   dosage: '500 mg',
 *   frequency: 'twice_daily',
 *   times_of_day: ['08:00', '20:00'], // HH:MM strings
 * })
 * await logDose(med.id, userId, { status: 'taken', taken_at: '2026-01-15T08:05:00.000Z' })
 * await logDose(med.id, userId, { status: 'skipped', taken_at: '2026-01-15T20:00:00.000Z' })
 *
 * const { taken, total, rate } = await adherenceRate(userId, '2026-01-01', '2026-01-31')
 * console.log(taken, total, rate) // 1 2 0.5 — rate is a FRACTION (0–1), not a percent
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
 * **Bond the DataStore first** (`setStore(...)` from `@molecule/api-database`).
 * `logDose` does NOT infer lateness from `times_of_day` — `status` defaults to
 * `'taken'` and `taken_at` to now. Nothing generates `missed` rows for doses
 * that were never logged, so `adherenceRate` (and `GET /adherence`, default
 * window the last 30 days) only counts what was logged: `rate = taken / total`
 * as a 0–1 fraction (`0` when nothing is logged). Compare `from`/`to` as ISO
 * strings — they filter `taken_at`. `GET /medications` includes inactive
 * medications; the service `listMedicationsForOwner` hides them unless
 * `{ include_inactive: true }`.
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
