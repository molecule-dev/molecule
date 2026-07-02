/**
 * Console (logger-based) error tracking provider for molecule.dev.
 *
 * Zero-credential development default: captures are written as structured
 * log lines through the bonded logger instead of being sent to a remote
 * service. Swap in a remote bond (e.g. `@molecule/api-error-tracking-sentry`)
 * for production without changing any consumer code.
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider, captureException } from '@molecule/api-error-tracking'
 * import { provider } from '@molecule/api-error-tracking-console'
 *
 * // Bond at startup (e.g. in setupBonds()) — no credentials needed
 * setProvider(provider)
 *
 * // Logs a structured "error-tracking: exception captured" line
 * captureException(new Error('boom'), { tags: { source: 'worker' } })
 * ```
 * @remarks
 * - Requires no configuration or credentials — safe in every environment.
 * - Each capture gets a generated event id (returned and logged), mirroring
 *   remote providers so consumer code behaves identically in development.
 * - `setUser()` scopes subsequent captures like a remote provider's user
 *   scope; `flush()` trivially resolves `true` (nothing is buffered).
 */

export * from './provider.js'
