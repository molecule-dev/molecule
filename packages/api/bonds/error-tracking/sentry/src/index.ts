/**
 * Sentry error tracking provider for molecule.dev.
 *
 * Reports exceptions and messages to Sentry via `@sentry/node`, mapping the
 * normalized `@molecule/api-error-tracking` context onto Sentry scopes
 * (tags/user/extra).
 *
 * @see https://www.npmjs.com/package/@sentry/node
 *
 * @example
 * ```typescript
 * import { captureException, flush, setProvider, setUser } from '@molecule/api-error-tracking'
 * import { provider } from '@molecule/api-error-tracking-sentry'
 *
 * // Startup: bond once. Env: SENTRY_DSN (required to send), SENTRY_ENVIRONMENT (optional).
 * setProvider(provider)
 *
 * setUser({ id: 'user-42', email: 'ada@example.com' })
 *
 * try {
 *   JSON.parse('{ not json')
 * } catch (error) {
 *   const eventId = captureException(error, {
 *     tags: { source: 'import-job' },
 *     extra: { fileName: 'contacts.csv' },
 *   })
 *   console.info(`reported to Sentry as ${eventId}`) // undefined while SENTRY_DSN is unset
 * }
 *
 * // Before a short-lived process exits: wait up to 2000 ms for the buffered events.
 * const delivered = await flush(2000)
 * ```
 *
 * @remarks
 * - **Without `SENTRY_DSN` the provider is a documented no-op.** It never
 *   throws or crashes an app that installed it but hasn't configured the
 *   key — captures simply do nothing, and the boot-time config report flags
 *   the missing `SENTRY_DSN` with setup instructions.
 * - The SDK is initialized lazily (once) on first use, from `SENTRY_DSN`,
 *   optional `SENTRY_ENVIRONMENT` (defaults to `NODE_ENV`), and optional
 *   `SENTRY_TRACES_SAMPLE_RATE` (0–1; unset disables tracing).
 * - **A returned event id does NOT confirm delivery.** The SDK buffers and
 *   sends asynchronously; a capture can return an id and still never reach
 *   Sentry (bad DSN, network egress blocked, process exited too soon). Call
 *   `flush(timeoutMs)` before process exit — `false` means events may have
 *   been dropped — and check the DSN/network before concluding the
 *   integration is broken.
 * - **Report through the core** (`captureException` / `captureMessage` / `setUser` / `flush`
 *   from `@molecule/api-error-tracking`), not `@sentry/node` directly — the core calls never
 *   throw and are silent no-ops when nothing is bonded. There is no `createProvider()`;
 *   configuration is env-only.
 * - `flush(timeoutMs)` takes MILLISECONDS. `SENTRY_TRACES_SAMPLE_RATE` outside 0–1 is logged
 *   and tracing is disabled, not rejected.
 * - `Sentry.init()` runs on the first capture, i.e. after your modules have loaded — so the
 *   SDK's automatic HTTP/framework instrumentation (which needs `init` before those imports)
 *   is not set up. Only explicit captures are reported.
 * - The request context is sent as `extra.request`, not as Sentry's native request interface.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
