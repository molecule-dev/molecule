/**
 * Feature flags core interface for molecule.dev.
 *
 * Provides the `FeatureFlagProvider` interface for feature flag management
 * including flag evaluation, CRUD operations, rule-based targeting, and
 * percentage rollouts. Bond a concrete provider
 * (e.g. `@molecule/api-feature-flags-database`) at startup via `setProvider()`.
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider, isEnabled, setFlag, evaluateForUser } from '@molecule/api-feature-flags'
 * import { provider } from '@molecule/api-feature-flags-database'
 *
 * // Wire the provider at startup
 * setProvider(provider)
 *
 * // Create a feature flag with percentage rollout
 * await setFlag({ name: 'new-dashboard', enabled: true, percentage: 50 })
 *
 * // Check if a flag is enabled for a user
 * const enabled = await isEnabled('new-dashboard', { userId: 'user-123' })
 *
 * // Evaluate all flags for a user
 * const flags = await evaluateForUser('user-123')
 * ```
 */

export * from './provider.js'
export * from './types.js'
