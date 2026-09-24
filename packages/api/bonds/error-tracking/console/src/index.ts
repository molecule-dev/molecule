/**
 * Console (logger-based) error tracking provider for molecule.dev.
 *
 * Zero-credential development default: captures are written as structured
 * log lines through the bonded logger instead of being sent to a remote
 * service. Swap in a remote bond (e.g. `@molecule/api-error-tracking-sentry`)
 * for production without changing any consumer code.
 *
 * @example
 * ```typescript
 * import { captureException, captureMessage, setProvider, setUser } from '@molecule/api-error-tracking'
 * import { provider } from '@molecule/api-error-tracking-console'
 *
 * // Startup: bond once — no credentials, no env vars.
 * setProvider(provider)
 *
 * setUser({ id: 'user-42', email: 'ada@example.com' }) // attached to later captures
 *
 * try {
 *   JSON.parse('{ not json')
 * } catch (error) {
 *   // Logs "error-tracking: exception captured" via the bonded logger (console fallback).
 *   const eventId = captureException(error, { tags: { source: 'import-job' } })
 *   console.info(`reported as ${eventId}`) // a random UUID
 * }
 *
 * captureMessage('Import finished with skipped rows', 'warning', { extra: { skipped: 3 } })
 * ```
 *
 * @remarks
 * - **Bond it with the core's `setProvider(provider)`** and report through the core's
 *   `captureException` / `captureMessage` / `setUser` / `flush` — those never throw, and are
 *   silent no-ops when nothing is bonded (so a missing bond hides every report).
 * - Nothing leaves the process: captures are log lines through `getLogger()` from
 *   `@molecule/api-bond` (the bonded `logger`, else `console`). Exceptions log at `error`;
 *   messages map `fatal`/`error` → `error`, `warning` → `warn`, `info`, `debug`. Use a remote
 *   bond (e.g. `@molecule/api-error-tracking-sentry`) in production.
 * - The generated event id is a random UUID — it is not looked up anywhere; `flush()` always
 *   resolves `true` (nothing is buffered).
 * - `setUser()` is module-global (one user for the whole process), not per request; pass
 *   `context.user` on the capture to override it for a single report.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
