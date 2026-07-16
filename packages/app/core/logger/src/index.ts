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
 * import { createLogger, error, warn } from '@molecule/app-logger'
 *
 * warn('cache miss', { key }) // root logger — no setup needed
 * error(err)                  // error() accepts an Error directly
 *
 * const log = createLogger('sync') // named/namespaced logger
 * log.debug('starting', { count })
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
