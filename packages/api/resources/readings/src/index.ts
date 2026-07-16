/**
 * `@molecule/api-resource-readings` — generic time-series sensor data.
 *
 * Ingest readings via `POST /` or `POST /bulk`, then query raw or
 * aggregated (5min / hour / day rollups) via `GET /?granularity=…`.
 *
 * Extracted from the energy-monitoring flagship — the pattern works
 * for any time-series surface (IoT sensors, app metrics, financial
 * tick data, etc.).
 *
 * @example
 * ```typescript
 * import { createReadingsRouter } from '@molecule/api-resource-readings'
 *
 * // Mount behind your global auth middleware — every route requires a session.
 * app.use('/readings', createReadingsRouter())
 * // POST /readings        — ingest one reading
 * // POST /readings/bulk   — ingest up to 10 000 readings
 * // GET  /readings?granularity=raw|5min|hour|day&sensor_id=…&metric=…&from=…&to=…
 * ```
 *
 * @example
 * ```typescript
 * import { ingestReading, listAggregatedReadings } from '@molecule/api-resource-readings'
 *
 * await ingestReading(userId, { sensor_id: 'meter-1', metric: 'kwh', value: 1.42 })
 * const hourly = await listAggregatedReadings(userId, { granularity: 'hour', metric: 'kwh' })
 * ```
 *
 * @remarks
 * Unlike declarative-route resources, this package ships an Express Router
 * FACTORY (`createReadingsRouter()`) — there is no `routes` /
 * `requestHandlerMap` export for `mlcl inject`; mount the router yourself.
 * Every route reads the caller via `requireUser(res)`
 * (`res.locals.session.userId`, 401 fail-closed), so it must sit behind the
 * global auth middleware, and every query/insert is scoped to that owner —
 * never accept a client-supplied owner id.
 *
 * Aggregated queries (`granularity` ≠ `raw`) run raw SQL using `date_trunc`,
 * `::int` casts, and `interval` literals — **PostgreSQL-only**. On the
 * SQLite/MySQL bonds use `granularity=raw` (DataStore-based, portable) and
 * bucket in application code, or supply your own dialect's aggregation.
 * `ingestBulk` inserts sequentially (one INSERT per reading, max 10 000 per
 * request).
 *
 * Tables: `src/__setup__/readings.sql` creates `readings` (owner-scoped via
 * `owner_id`). An mlcl-scaffolded API replays `__setup__/*.sql` automatically
 * on migrate; anywhere else run it once — nothing at runtime creates them.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is a correctness bug to fix — not a skip:
 * - [ ] Recording a reading (POST /) persists its value, unit, metric, and
 *   recorded_at against the right sensor_id, and the chart/list reflects it:
 *   the newest point is the LAST entry of the chronological raw query (readings
 *   come back ordered by recorded_at ascending), so it shows the true latest
 *   value for that sensor — not a stale or averaged one.
 * - [ ] A time-range query (from/to) returns ONLY readings inside the window,
 *   in chronological order, with no gaps or duplicates — points outside the
 *   range are absent and a point exactly on a boundary is present.
 * - [ ] An aggregated query (granularity=5min|hour|day) computes the correct
 *   min/max/avg/sum/count for the readings in each bucket — spot-check one
 *   bucket by hand against its raw points (avg = sum / count; min and max are
 *   real members of the bucket; count matches the number of raw points).
 *   Aggregation is Postgres-only; on SQLite/MySQL use granularity=raw and
 *   verify the app buckets client-side instead.
 * - [ ] Every value renders as a real number with its unit (e.g. "1.42 kwh"),
 *   never NaN, null, or undefined; a gap in the readings shows as a gap (or an
 *   explicit "no data"), never as a fabricated 0.
 * - [ ] Malformed readings are rejected, not stored as truth: a non-numeric or
 *   NaN value, or a missing sensor_id/metric, is refused by validation (400) and
 *   never ingested; if the domain has a sane range, an out-of-range value is
 *   flagged/rejected by the app, not silently recorded. If the readings are
 *   health or otherwise personal, missing data is never shown as zero.
 * - [ ] AUTHORIZATION — readings are scoped to owner_id (the authenticated
 *   session user via requireUser): a user sees ONLY their own readings, and no
 *   sensor_id/from/to filter or guessed id surfaces another user's data.
 *   Ingestion is authenticated (401 fail-closed) and the owner is taken from the
 *   session, never the request body — a caller can't spoof readings onto another
 *   owner or device.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
