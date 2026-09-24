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
 * import { record, setSink } from '@molecule/api-activity'
 * import { createHttpSink } from '@molecule/api-activity-http'
 *
 * // Startup: bond the sink through the activity core. Config comes from the server env.
 * setSink(
 *   createHttpSink({
 *     url: process.env.MOLECULE_ACTIVITY_URL, // e.g. 'https://my-app.example/v1/activity'
 *     token: process.env.MOLECULE_VAULT_TOKEN, // sent as `Authorization: Bearer <token>`
 *     appId: process.env.MOLECULE_APP_ID, // sent as `X-Molecule-App-Id`
 *   }),
 * )
 *
 * // Wherever an email/SMS/push/webhook is captured or sent — POSTs the event as JSON:
 * await record({
 *   id: crypto.randomUUID(),
 *   type: 'email',
 *   status: 'captured',
 *   recipient: 'user@example.com',
 *   summary: 'Welcome email',
 *   timestamp: new Date().toISOString(),
 * })
 * ```
 *
 * @remarks
 * - Wire it with `setSink(...)` from `@molecule/api-activity` and emit through that
 *   core's `record()` — `record()` silently no-ops when no sink is bonded.
 * - **No URL → no request.** With neither `url` nor `MOLECULE_ACTIVITY_URL` set,
 *   every event is skipped (only a `logger.debug` line) — a missing env var looks
 *   like "works, nothing arrives".
 * - **Never throws and never retries.** Network errors and non-2xx responses are
 *   logged with `logger.warn` and the event is dropped; don't use it as a durable
 *   audit log.
 * - The whole `ActivityEvent` (including `payload`) is sent as the JSON body —
 *   keep secrets out of `payload`.
 * - `url`/`token`/`appId` options win over the env vars, which are read at
 *   `record()` time, not when the sink is created.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
