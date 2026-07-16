/**
 * Environment configuration provider for molecule.dev.
 *
 * @remarks
 * - **Values are always strings at runtime.** `get<T>()` casts, it does not
 *   coerce: `get<number>('PORT')` returns the string `'3000'`. Use the core's
 *   `getNumber()` / `getBoolean()` / `getString()` helpers from
 *   `@molecule/api-config` for typed reads, or convert explicitly.
 * - `set()` writes back to `process.env` (stringified) — visible to the whole
 *   process, not persisted anywhere.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-config'
 * import { provider } from '@molecule/api-config-env'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
