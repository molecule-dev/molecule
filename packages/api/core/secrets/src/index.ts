/**
 * Secrets management core interface for molecule.dev.
 *
 * Provides a standardized way to:
 * - Define required secrets for packages
 * - Retrieve secrets from various providers (env, Doppler, Vault, etc.)
 * - Validate secrets at startup
 * - Auto-provision services
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
