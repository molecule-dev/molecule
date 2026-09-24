/**
 * Secrets management core interface.
 *
 * Provides a standardized way to:
 * - Define required secrets for packages
 * - Retrieve secrets from various providers (env, Doppler, Vault, etc.)
 * - Validate secrets at startup
 * - Auto-provision services
 *
 * @remarks
 * Secrets are SERVER-SIDE only. NEVER send a secret value to the browser, embed it in
 * client code, or expose it through a `VITE_`/`NEXT_PUBLIC_` build var — those ship to
 * every user. Only a PUBLISHABLE/public key (Stripe `pk_…`, a VAPID public key, an OAuth
 * client id) may be client-side; everything from {@link get}/{@link getRequired} stays in
 * the API.
 *
 * - Never log a secret VALUE or return it in an API response / error message.
 * - Don't hardcode secrets — read them via {@link get}/{@link getRequired} (env/Doppler/
 *   Vault) so they're never committed. {@link getRequired} throws at startup when unset
 *   (fail fast) — prefer it for anything the app can't run without.
 * - Use {@link validate} at boot to surface every missing/invalid secret at once.
 * - With NO provider bonded, `get`/`getRequired` silently fall back to `process.env` — a `.env`
 *   file is only read once `@molecule/api-secrets-env` (or another bond) is wired via
 *   `setProvider(...)`.
 * - `getRequired` treats an EMPTY string as missing and throws.
 * - The env bond lets an already-set `process.env` value WIN over the `.env` file unless
 *   `createEnvProvider({ override: true })`.
 * - `logConfigReport` only logs — it never throws. Use `report.ok` / `getRequired` to actually
 *   stop boot.
 *
 * @example
 * ```typescript
 * import {
 *   buildConfigReport,
 *   getRequired,
 *   logConfigReport,
 *   registerSecret,
 *   setProvider,
 * } from '@molecule/api-secrets'
 * import { createEnvProvider } from '@molecule/api-secrets-env'
 *
 * // Startup: bond the provider (reads `.env`, then process.env) before any secret lookup.
 * setProvider(createEnvProvider({ path: '.env' }))
 *
 * // Declare what this app needs (provider bonds register their own at import time).
 * registerSecret({
 *   key: 'GEOCODER_API_KEY',
 *   description: 'API key for the geocoding service',
 *   helpUrl: 'https://geocoder.example.com/keys',
 * })
 *
 * // Boot report: one warning per missing REQUIRED secret — it never throws.
 * const report = logConfigReport(await buildConfigReport(['GEOCODER_API_KEY', 'PORT']))
 * console.log(report.ok) // false when any required secret is missing
 *
 * // Fail fast for anything the app cannot run without (throws when unset or empty).
 * const geocoderKey = await getRequired('GEOCODER_API_KEY')
 * ```
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider management
export * from './provider.js'

// Registry
export * from './registry.js'

// Boot-time configuration report + actionable config errors
export * from './report.js'
