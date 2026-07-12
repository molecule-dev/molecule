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
 *
 * @example
 * ```typescript
 * import { get, getRequired, validate, COMMON_SECRETS } from '@molecule/api-secrets'
 *
 * // Get a secret (returns undefined if not set)
 * const apiKey = await get('STRIPE_SECRET_KEY')
 *
 * // Get a required secret (throws if not set)
 * const dbUrl = await getRequired('DATABASE_URL')
 *
 * // Validate multiple secrets
 * const results = await validate([
 *   COMMON_SECRETS.DATABASE_URL,
 *   COMMON_SECRETS.STRIPE_SECRET_KEY,
 * ])
 * ```
 *
 * @module
 */

// Type exports
export * from './types.js'

// Provider management
export * from './provider.js'

// Registry
export * from './registry.js'

// Boot-time configuration report + actionable config errors
export * from './report.js'
