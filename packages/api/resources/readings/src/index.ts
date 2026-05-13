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
 * @module
 */

export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
