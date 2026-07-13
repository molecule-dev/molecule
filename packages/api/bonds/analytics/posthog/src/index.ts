/**
 * PostHog analytics provider for molecule.dev.
 *
 * PostHog is an open-source product analytics platform.
 *
 * @example
 * ```typescript
 * import { setProvider, track } from '@molecule/api-analytics'
 * import { provider, shutdown } from '@molecule/api-analytics-posthog'
 *
 * setProvider(provider) // reads POSTHOG_API_KEY / POSTHOG_HOST lazily
 * await track({ name: 'purchase.completed', userId: 'u_123' })
 *
 * // PostHog BATCHES events — flush before the process exits:
 * await shutdown()
 * ```
 *
 * @remarks
 * - Events are QUEUED, not sent per call: `track()` resolves immediately and
 *   the SDK delivers in batches (`flushAt`, default 20 events / `flushInterval`,
 *   default 10s). A short-lived process (CLI, cron job, serverless handler,
 *   test) that exits without `await shutdown()` (default `provider`) or the
 *   provider's `flush()` silently loses queued events.
 * - `shutdown()` flushes only the default `provider`'s client. A provider from
 *   `createProvider()` owns its own client — call its `flush()` instead.
 * - Missing POSTHOG_API_KEY does NOT throw: the bond logs ONE actionable
 *   warning naming the key and the SDK disables itself — every call resolves
 *   successfully while nothing is sent. (The SDK's own "client will be
 *   disabled" error is debug-gated and otherwise SILENT.) If events never
 *   appear in PostHog, check the boot log for that warning before debugging
 *   your tracking code.
 * - Server-side calls have no ambient session: pass `userId` (or
 *   `anonymousId`) on `track()` AND `page()` or events pile up under a single
 *   shared "anonymous" person.
 * - When `POSTHOG_HOST` is unset, the SDK's own default host applies (PostHog
 *   Cloud US, `https://us.i.posthog.com`). EU-region projects MUST set
 *   `POSTHOG_HOST=https://eu.i.posthog.com` — an EU project key sent to the
 *   US endpoint is accepted and dropped silently (events never appear, no
 *   error is returned).
 *
 * @see https://www.npmjs.com/package/posthog-node
 *
 * @module
 */

export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
