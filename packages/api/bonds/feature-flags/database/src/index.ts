/**
 * Database-backed feature flags provider for molecule.dev.
 *
 * Persists feature flags using the abstract `DataStore` from
 * `@molecule/api-database`. Supports rule-based targeting, percentage
 * rollouts, and bulk user evaluation.
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider, isEnabled, setFlag } from '@molecule/api-feature-flags'
 * import { provider } from '@molecule/api-feature-flags-database'
 *
 * // Wire the provider at startup (default table: 'feature_flags')
 * setProvider(provider)
 *
 * // Or create with custom config
 * import { createProvider } from '@molecule/api-feature-flags-database'
 * const customProvider = createProvider({ tableName: 'flags' })
 * setProvider(customProvider)
 * ```
 */

export * from './provider.js'
export * from './types.js'
