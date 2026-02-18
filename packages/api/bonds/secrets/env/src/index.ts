/**
 * Environment variables secrets provider for molecule.dev.
 *
 * Reads secrets from .env files and process.env.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-secrets'
 * import { provider } from '@molecule/api-secrets-env'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

export * from './provider.js'
