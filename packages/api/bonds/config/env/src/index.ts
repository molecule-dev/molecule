/**
 * Environment configuration provider for molecule.dev.
 *
 * @example
 * ```typescript
 * import { getBoolean, getNumber, getRequired, setProvider, validate } from '@molecule/api-config'
 * import { provider } from '@molecule/api-config-env'
 *
 * // Startup: bond the env provider once, before any config read.
 * setProvider(provider)
 *
 * // Fail fast at boot if required variables are missing or malformed.
 * const result = validate([
 *   { key: 'DATABASE_URL', type: 'string', required: true },
 *   { key: 'PORT', type: 'number', min: 1, max: 65535 },
 *   { key: 'FEATURE_SIGNUPS', type: 'boolean' },
 * ])
 * if (!result.valid) {
 *   throw new Error(result.errors.map((e) => e.message).join('\n'))
 * }
 *
 * const databaseUrl = getRequired('DATABASE_URL') // string — throws if unset
 * const port = getNumber('PORT', 3000) // number, parsed from the env string
 * const signupsOpen = getBoolean('FEATURE_SIGNUPS', false) // 'true' | '1' | 'yes' → true
 * ```
 *
 * @remarks
 * - **Wire it through the core, not `bond('config-env', ...)`:** `setProvider(provider)` from
 *   `@molecule/api-config`. Reads before that throw "No configuration provider set".
 * - **Values are always strings at runtime.** `get<T>()` casts, it does not
 *   coerce: `get<number>('PORT')` returns the string `'3000'`. Use the core's
 *   `getNumber()` / `getBoolean()` / `getString()` helpers from
 *   `@molecule/api-config` for typed reads, or convert explicitly.
 * - **It does not load `.env` files.** It only reads `process.env`; load a `.env` yourself (or
 *   let the runtime/host inject variables) before the first read.
 * - `validate()` does NOT apply a schema's `default` — it only reports errors. Pass defaults to
 *   the getters (`getNumber('PORT', 3000)`).
 * - `set()` writes back to `process.env` (stringified) — visible to the whole
 *   process, not persisted anywhere.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
