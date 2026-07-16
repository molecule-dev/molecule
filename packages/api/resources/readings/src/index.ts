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
 * @module
 */

export * from './browser-guard.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
