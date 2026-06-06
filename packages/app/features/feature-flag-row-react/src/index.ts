/**
 * Feature-flag list row.
 *
 * Exports `<FeatureFlagRow>`, `FeatureFlag`, `FeatureFlagEnvironment`, `FlagType` types.
 *
 * @example
 * ```tsx
 * import { FeatureFlagRow } from '@molecule/app-feature-flag-row-react'
 *
 * <FeatureFlagRow
 *   flag={{
 *     key: 'new-checkout',
 *     name: 'New Checkout Flow',
 *     description: 'Redesigned multi-step checkout experience.',
 *     type: 'percentage',
 *     environments: [
 *       { id: 'staging', label: 'Staging', enabled: true, rolloutPct: 100 },
 *       { id: 'production', label: 'Production', enabled: true, rolloutPct: 20 },
 *     ],
 *   }}
 *   onToggle={(key, envId, next) => updateFlag(key, envId, next)}
 * />
 * ```
 * @module
 */

export * from './FeatureFlagRow.js'
