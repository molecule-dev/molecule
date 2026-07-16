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
 *
 * @remarks
 * - **The flags table must already exist — this bond never creates it.** Add
 *   a migration for `feature_flags` (or your `config.tableName`) with columns:
 *   `id` (uuid/text, PK), `name` (text, unique), `enabled` (boolean/integer),
 *   `description` (text, nullable), `rules` (text — JSON-serialized, nullable),
 *   `percentage` (integer, nullable), `created_at` / `updated_at` (timestamp).
 * - **Wire the database bond first.** Every method delegates to the bonded
 *   `@molecule/api-database` DataStore; with no database bonded, calls throw.
 * - `isEnabled()` on an unknown flag returns `false` (fail-closed), but
 *   `deleteFlag()` on an unknown flag THROWS (`Feature flag not found: <name>`).
 * - Targeting rules are AND-combined (every rule must match); percentage
 *   rollout applies after rules and only when `context.userId` is present —
 *   see `@molecule/api-feature-flags` remarks for the no-context fallback.
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
