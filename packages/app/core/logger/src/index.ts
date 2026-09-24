/**
 * Frontend logging interface for molecule.dev.
 *
 * Provides a unified logging API that can be backed by different
 * implementations (console, loglevel, remote logging, etc.). Works with ZERO
 * wiring: on first use a console-backed provider is auto-bonded (level
 * `'debug'` in development, `'info'` otherwise) — call {@link setProvider}
 * only to swap in a custom provider.
 *
 * @example
 * ```typescript
 * import {
 *   createConsoleLoggerProvider,
 *   createLogger,
 *   createRemoteTransport,
 *   getProvider,
 *   setProvider,
 *   warn,
 * } from '@molecule/app-logger'
 *
 * // Optional: bond explicitly to pick the level (otherwise auto-bonded on first use).
 * setProvider(createConsoleLoggerProvider(import.meta.env.DEV ? 'debug' : 'info'))
 * // Optional: ship warn+ entries to your API — batched (10 entries or every 5 s).
 * getProvider().addTransport(createRemoteTransport({ url: '/api/client-logs', minLevel: 'warn' }))
 *
 * const log = createLogger('sync') // console lines are prefixed '[sync]'
 * log.info('sync started', { pending: 3 })
 *
 * try {
 *   JSON.parse('{ not json')
 * } catch (err) {
 *   log.error(err as Error, { source: 'cache' }) // error() accepts the Error itself
 * }
 * warn('cache miss', { key: 'user:42' }) // root logger — no name needed
 * ```
 *
 * @remarks
 * - **Log through this API, never bare `console.log`** — levels, namespaces,
 *   and transports (remote error tracking) only apply to entries that flow
 *   through the logger. Every caught error is logged WITH the error object
 *   attached (or re-thrown) — never swallowed silently.
 * - **`getLogger('name')` does NOT create a logger** — it returns the ROOT
 *   logger unless `createLogger('name')` registered that name first. Create
 *   named loggers explicitly.
 * - The auto-bonded provider picks `'debug'` only when `process.env.NODE_ENV ===
 *   'development'` — usually absent in the browser, so expect `'info'` (debug lines
 *   dropped) unless you bond `createConsoleLoggerProvider(level)` yourself.
 * - `createRemoteTransport()` POSTs `{ logs: LogEntry[] }` with plain `fetch` to `url`
 *   (NOT through `@molecule/app-http`: no baseURL, no auth header — pass `headers`).
 * - **Never log secrets, tokens, or PII.** Entries reach the browser console
 *   and every registered transport — {@link createRemoteTransport} batches
 *   them to a remote HTTP endpoint, so a logged credential leaves the device.
 * - Remote delivery is best-effort by design (a failing transport is dropped
 *   silently to avoid log-failure recursion) — don't rely on transports for
 *   audit-grade trails.
 *
 * @module
 */

export * from './console-logger.js'
export * from './provider.js'
export * from './types.js'
export * from './utilities.js'
