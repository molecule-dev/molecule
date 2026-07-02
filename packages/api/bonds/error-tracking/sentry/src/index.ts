/**
 * Sentry error tracking provider for molecule.dev.
 *
 * Reports exceptions and messages to Sentry via `@sentry/node`, mapping the
 * normalized `@molecule/api-error-tracking` context onto Sentry scopes
 * (tags/user/extra).
 *
 * @see https://www.npmjs.com/package/@sentry/node
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider, captureException } from '@molecule/api-error-tracking'
 * import { provider } from '@molecule/api-error-tracking-sentry'
 *
 * // Bond at startup (e.g. in setupBonds())
 * setProvider(provider)
 *
 * // Anywhere in the app — delivered to Sentry once SENTRY_DSN is set
 * captureException(new Error('boom'), { tags: { source: 'worker' } })
 * ```
 * @remarks
 * - **Without `SENTRY_DSN` the provider is a documented no-op.** It never
 *   throws or crashes an app that installed it but hasn't configured the
 *   key — captures simply do nothing, and the boot-time config report flags
 *   the missing `SENTRY_DSN` with setup instructions.
 * - The SDK is initialized lazily (once) on first use, from `SENTRY_DSN`,
 *   optional `SENTRY_ENVIRONMENT` (defaults to `NODE_ENV`), and optional
 *   `SENTRY_TRACES_SAMPLE_RATE` (0–1; unset disables tracing).
 * - Call `flush(timeoutMs)` before process exit so buffered events are
 *   delivered.
 */

export * from './provider.js'
export * from './secrets.js'
