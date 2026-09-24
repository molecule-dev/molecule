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
 * import express from 'express'
 *
 * import { setPool, setStore } from '@molecule/api-database'
 * import { pool, store } from '@molecule/api-database-postgresql'
 * import {
 *   createReadingsRouter,
 *   ingestReading,
 *   listAggregatedReadings,
 *   listRawReadings,
 * } from '@molecule/api-resource-readings'
 *
 * // Startup: bond the DataStore AND the raw pool — rollups (granularity ≠ raw) use raw SQL.
 * // The postgresql bond reads DATABASE_URL. Mount behind your global auth middleware.
 * setPool(pool)
 * setStore(store)
 * const app = express()
 * app.use(express.json())
 * app.use('/readings', createReadingsRouter())
 * // POST /readings · POST /readings/bulk { readings: [...] } (≤ 10 000)
 * // GET  /readings?granularity=raw|5min|hour|day&sensor_id=…&metric=…&from=…&to=…
 *
 * // Server-side equivalent, as the SESSION user:
 * const userId = 'user-123'
 * const reading = { sensor_id: 'meter-1', metric: 'kwh', unit: 'kWh' }
 * await ingestReading(userId, { ...reading, value: 1.4, recorded_at: '2026-09-24T10:05:00Z' })
 * await ingestReading(userId, { ...reading, value: 1.6, recorded_at: '2026-09-24T10:35:00Z' })
 *
 * const raw = await listRawReadings(userId, { sensor_id: 'meter-1' }) // oldest first
 * const hourly = await listAggregatedReadings(userId, { granularity: 'hour', metric: 'kwh' })
 * console.log(raw.length, hourly[0]?.sum, hourly[0]?.avg) // 2 3 1.5
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
 * Bond `setPool(pool)` as well as `setStore(store)` or every rollup throws.
 * `ingestBulk` inserts sequentially (one INSERT per reading, max 10 000 per
 * request) with no transaction, so a mid-batch failure leaves the earlier
 * rows written. Raw queries default to `limit` 1000 (rollups 5000) — pass
 * `from`/`to` (ISO strings, compared against `recorded_at`) for long series.
 * `recorded_at` defaults to NOW when omitted: send the device timestamp.
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
