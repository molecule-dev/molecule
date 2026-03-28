/**
 * Database-backed workflow provider for molecule.dev.
 *
 * Stores workflow definitions, instances, and event history using the
 * abstract `@molecule/api-database` DataStore. Wire this provider at
 * startup with `setProvider(provider)` from `@molecule/api-workflow`.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-workflow'
 * import { provider } from '@molecule/api-workflow-database'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
