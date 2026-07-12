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
 *
 * @example
 * ```typescript
 * import {
 *   setProvider,
 *   get,
 *   getRequired,
 *   getNumber,
 *   getBoolean,
 *   getJson,
 *   has,
 *   validate,
 * } from '@molecule/api-config'
 * import { provider } from '@molecule/api-config-env'
 *
 * // Wire the provider at app startup
 * setProvider(provider)
 *
 * // Get configuration values
 * const apiKey = getRequired('API_KEY')
 * const port = getNumber('PORT', 3000)
 * const debug = getBoolean('DEBUG', false)
 * const config = getJson('APP_CONFIG', {})
 *
 * // Validate configuration schema
 * const result = validate([
 *   { key: 'DATABASE_URL', required: true },
 *   { key: 'PORT', type: 'number', min: 1, max: 65535 },
 * ])
 * ```
 *
 * @module
 */

// Type exports
export * from './types.js'

// Provider exports
export * from './provider.js'
