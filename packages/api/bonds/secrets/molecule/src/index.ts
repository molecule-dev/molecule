/**
 * Molecule managed-vault secrets provider for molecule.dev.
 *
 * Fetches a single app's secrets from molecule.dev's managed, per-app encrypted
 * vault at runtime, caches them with a TTL, serves stale cache on transient
 * failure, and only then falls back to `process.env`. The bootstrap token + app
 * id are the only secrets that live in the environment. It is also the seam
 * through which credential brokering is delivered with no app-code change.
 *
 * @example
 * ```typescript
 * import { bond } from '@molecule/api-bond'
 * import { provider } from '@molecule/api-secrets-molecule'
 *
 * bond('secrets', provider)
 * // ...then, unchanged: await resolveAll([ ...keys... ]) → syncToEnv → process.env
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
