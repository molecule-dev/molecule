/**
 * Console logger provider for molecule.dev.
 *
 * @example
 * ```typescript
 * import { logger, setLogger } from '@molecule/api-logger'
 * import { provider } from '@molecule/api-logger-console'
 *
 * setLogger(provider)
 * logger.info('Server started on port', 3000)
 * ```
 * @remarks
 * - The provider passes every level straight to the matching `console`
 *   method — minimum-level filtering happens once, in `@molecule/api-logger`
 *   (`LOG_LEVEL` env var / `setLevel()`, default `'info'`). A "missing"
 *   `logger.debug(...)` line means the CORE's gate dropped it — lower the
 *   gate; the provider has no level configuration of its own.
 * - `trace` delegates to `console.trace`, which prints a stack trace with
 *   every call (console behavior, not a bug).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
