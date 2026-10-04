/**
 * Axiom analytics provider for molecule.dev.
 *
 * Sends every `track()` / `identify()` / `page()` / `group()` call as one
 * event to an [Axiom](https://axiom.co) dataset through Axiom's ingest API.
 * Events are queued in memory and sent in NDJSON batches, so a call never
 * waits on the network and never throws.
 *
 * @example
 * ```typescript
 * import { setProvider, track } from '@molecule/api-analytics'
 * import { createProvider } from '@molecule/api-analytics-axiom'
 *
 * const axiom = createProvider({
 *   // token / dataset default to AXIOM_TOKEN / AXIOM_DATASET
 *   service: 'my-api',
 *   region: process.env.FLY_REGION,
 *   version: process.env.APP_VERSION,
 * })
 * setProvider(axiom)
 *
 * await track({ name: 'order.placed', userId: 'u_123', properties: { total: 42 } })
 *
 * // Before the process exits, send what is still queued:
 * await axiom.shutdown()
 * ```
 *
 * @remarks
 * - **No token or no dataset → a silent no-op.** `enabled` is `false` and every
 *   call resolves without sending anything. Check `provider.enabled` at boot if
 *   you want to log whether Axiom is on.
 * - Configuration (each option falls back to the env var): `token` →
 *   `AXIOM_TOKEN`, `dataset` → `AXIOM_DATASET`, `orgId` → `AXIOM_ORG_ID` (only
 *   needed for a personal token; an API token carries its org), `edgeUrl` →
 *   `AXIOM_EDGE_URL` (e.g. `https://eu-central-1.aws.edge.axiom.co`; when set,
 *   events go to `<edge>/v1/ingest/<dataset>`, otherwise to
 *   `https://api.axiom.co/v1/datasets/<dataset>/ingest`).
 * - Batching: a batch is sent every `flushIntervalMs` (2 s), or at once when
 *   `maxBatchEvents` (500) are queued; a request body never exceeds
 *   `maxBatchBytes` (1 MB). Network errors, 429 and 5xx are retried with
 *   exponential backoff (`maxRetries` 4, from `retryBaseMs` 500 ms); a 429/503
 *   with `Retry-After` waits that long instead (at most 60 s); other 4xx drop
 *   the batch. A 200 whose body reports `failed` events counts only the stored
 *   ones as `sent` and the rest as `dropped` (with a warning). When `maxQueueEvents` (10 000) are waiting, or the
 *   queue holds `maxQueueBytes` (32 MB, never less than `maxBatchBytes`), a new
 *   event is dropped and counted — the older queued events are kept, so the
 *   record stays contiguous from where sending stopped; a single event larger
 *   than `maxBatchBytes` is dropped, never queued. Every kind of failure warns at most once a minute, through
 *   `console.warn` (or the `warn` option) — never through a logger bond, so a
 *   logger that mirrors into Axiom cannot loop.
 * - **Short-lived processes must `await provider.shutdown()`** (or `flush()`)
 *   before exiting, or queued events are lost. The flush timer is `unref`'d and
 *   does not keep a process alive. `shutdown({ deadlineMs })` (default
 *   5000 ms; pass a larger budget if your host waits longer before killing the
 *   process) drains within that total budget: each remaining batch gets one
 *   attempt (no retries). At the deadline everything still running stops,
 *   including a flush already in flight with its retries and `Retry-After`
 *   waits, so nothing keeps the process alive after `shutdown()` resolves.
 *   Events not sent by then (queued or in flight) are counted as `dropped`
 *   and reported in one warning with the pending count. A `Retry-After` never waits less than `retryBaseMs`. Events tracked after `shutdown()` are counted as
 *   `dropped`, never queued.
 * - Event shape: `{ _time, kind, event, userId?, anonymousId?, properties?,
 *   service?, env?, region?, version? }`. `kind` is `track` / `identify` /
 *   `page` / `group`; `event` is the event name (`page.view` for pages,
 *   `user.identified` for identify). `service` / `region` / `version` come from
 *   the options, `env` defaults to `NODE_ENV`; `stamp` adds more fixed fields.
 * - `properties` is sent as a nested object, so Axiom indexes each key as its
 *   own field (`properties.projectId`). Axiom caps fields per dataset (256 on
 *   the free Personal plan, 1 024 on Axiom Cloud as of 2026-10), so keep
 *   property names stable rather than putting ids or free text in KEYS.
 * - `beforeSend(event)` runs on every event before it is queued; return a
 *   changed copy (for example with secrets redacted) or `null` to drop it.
 * - `provider` is a default instance configured from env on first use;
 *   `createProvider()` makes independent instances (each with its own queue).
 * - The ingest client is exported as `createAxiomIngester()` for other
 *   Axiom bonds (`@molecule/api-logger-axiom` uses it).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './ingester.js'
export * from './provider.js'
export * from './types.js'
