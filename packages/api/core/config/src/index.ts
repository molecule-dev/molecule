/**
 * Configuration core interface for molecule.dev.
 *
 * Defines the standard interface for configuration providers with
 * typed accessors for strings, numbers, booleans, and JSON values.
 *
 * @remarks
 * Config values are SERVER-SIDE. A secret read here (`API_KEY`, `DATABASE_URL`) must never be
 * sent to the browser or exposed through a `VITE_`/`NEXT_PUBLIC_` var — only a publishable /
 * public value may be client-side (see `@molecule/api-secrets`). Use `getRequired` for anything
 * the app can't run without (it throws at startup — fail fast), `validate` at boot to catch
 * every missing/invalid value at once, and never log a secret value.
 * - **Bond a provider first** — `setProvider(provider)` from `@molecule/api-config-env` at
 *   startup; every getter throws until then. The env bond reads `process.env` only — it does
 *   NOT load `.env` files.
 * - **`get<T>()` casts, it does not coerce** — env values are strings, so
 *   `get<number>('PORT')` is the string `'3000'`. Use `getNumber` / `getBoolean` / `getJson`.
 * - `getBoolean` is true only for `'true'`, `'1'`, `'yes'` (case-insensitive); anything else
 *   that is SET is `false`. `getNumber`/`getJson` silently fall back to the default on a
 *   malformed value — `validate()` is what reports it.
 * - `validate()` only REPORTS errors (`{ valid, errors }`) — invalid config does not throw and
 *   a schema `default` is never applied; throw on `!result.valid` yourself. (It does throw if
 *   the bonded provider has no `validate` — the env bond has one.)
 *
 * @example
 * ```typescript
 * import {
 *   getBoolean,
 *   getJson,
 *   getNumber,
 *   getRequired,
 *   setProvider,
 *   validate,
 * } from '@molecule/api-config'
 * import { provider } from '@molecule/api-config-env'
 *
 * // Startup: bond the env provider once, before any config read.
 * setProvider(provider)
 *
 * // Fail fast at boot: validate() reports every problem at once, it does not throw.
 * const result = validate([
 *   { key: 'DATABASE_URL', type: 'string', required: true },
 *   { key: 'PORT', type: 'number', min: 1, max: 65535 },
 * ])
 * if (!result.valid) throw new Error(result.errors.map((e) => e.message).join('\n'))
 *
 * const databaseUrl = getRequired('DATABASE_URL') // throws if unset
 * const port = getNumber('PORT', 3000) // parsed number; 3000 when unset/malformed
 * const debug = getBoolean('DEBUG', false) // 'true' | '1' | 'yes' → true
 * const flags = getJson<{ beta: boolean }>('APP_FLAGS', { beta: false })
 * ```
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
