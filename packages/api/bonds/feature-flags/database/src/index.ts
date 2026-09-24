/**
 * Database-backed feature flags provider for molecule.dev.
 *
 * Persists feature flags using the abstract `DataStore` from
 * `@molecule/api-database`. Supports rule-based targeting, percentage
 * rollouts, and bulk user evaluation.
 *
 * @example
 * ```typescript
 * import { setStore } from '@molecule/api-database'
 * import { store } from '@molecule/api-database-postgresql'
 * import { isEnabled, setFlag, setProvider } from '@molecule/api-feature-flags'
 * import { createProvider } from '@molecule/api-feature-flags-database'
 *
 * // Startup: bond the database FIRST (DATABASE_URL), then the flags provider.
 * setStore(store)
 * setProvider(createProvider({ tableName: 'feature_flags' })) // the table comes from a migration
 *
 * // Create or update a flag (upsert by name): on for Pro-plan users only.
 * await setFlag({
 *   name: 'new-checkout',
 *   enabled: true,
 *   description: 'Redesigned checkout flow',
 *   rules: [{ attribute: 'plan', operator: 'eq', value: 'pro' }],
 * })
 *
 * const proUser = await isEnabled('new-checkout', { userId: 'u1', attributes: { plan: 'pro' } })
 * const freeUser = await isEnabled('new-checkout', { userId: 'u2', attributes: { plan: 'free' } })
 * console.log(proUser, freeUser) // true false
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
 *   Rules are also skipped entirely when `isEnabled()` gets NO context — pass
 *   `{ attributes }` or a rule-gated flag reads as on for everyone.
 * - `setFlag()` is an upsert by `name` that REPLACES `rules`/`percentage`/
 *   `description` — omitted fields are cleared to `null`, not kept.
 * - Every `isEnabled()` is a database read (no caching); use `evaluateForUser()`
 *   to resolve many flags for one user in a single query.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
