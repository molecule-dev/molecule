/**
 * Generic HTTP activity sink.
 *
 * POSTs captured activity events to a configured ingest endpoint (the `url`
 * option or the `MOLECULE_ACTIVITY_URL` env var). No endpoint is assumed — when
 * none is configured the sink no-ops, so an unconfigured consumer never
 * silently phones home. Best-effort — never throws on failure.
 *
 * @example
 * ```typescript
 * import { setSink } from '@molecule/api-activity'
 * import { createHttpSink } from '@molecule/api-activity-http'
 *
 * setSink(createHttpSink({ url: 'https://my-app.example/v1/activity' }))
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
