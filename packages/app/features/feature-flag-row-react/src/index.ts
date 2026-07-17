/**
 * Feature-flag list row — flag name + type badge + key + description on
 * the left, one labelled `<Switch>` per environment (with a rollout-%
 * readout for percentage flags) on the right. Stack rows inside a list
 * or table to build a flags dashboard.
 *
 * Exports `<FeatureFlagRow>` and the `FeatureFlag`,
 * `FeatureFlagEnvironment`, and `FlagType` types.
 *
 * @example
 * ```tsx
 * import { FeatureFlagRow } from '@molecule/app-feature-flag-row-react'
 *
 * function FlagsList() {
 *   return (
 *     <FeatureFlagRow
 *       flag={{
 *         key: 'new-checkout',
 *         name: 'New Checkout Flow',
 *         description: 'Redesigned multi-step checkout experience.',
 *         type: 'percentage',
 *         environments: [
 *           { id: 'staging', label: 'Staging', enabled: true, rolloutPct: 100 },
 *           { id: 'production', label: 'Production', enabled: true, rolloutPct: 20 },
 *         ],
 *       }}
 *       onToggle={(key, envId, next) => updateFlag(key, envId, next)}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * The environment toggle is the `<Switch>` from the
 * `@molecule/app-ui-react` peer dependency — that package must be
 * installed and its ClassMap bond wired for the row to render styled.
 *
 * `rolloutPct` is displayed only when `flag.type === 'percentage'`; on
 * other flag types the field is ignored. The row is presentation-only:
 * `onToggle` receives `(flagKey, envId, next)` and the caller persists
 * the change and re-renders with updated `flag` data.
 *
 * The type badge translates via `t('flagType.<type>')` with a
 * capitalized English label (`Boolean`, `Multivariate`, `Percentage`,
 * `String`) as the fallback. No locale bond currently ships `flagType.*`
 * keys — add them to your app's own locale resources for non-English UIs.
 *
 * @module
 */

export * from './FeatureFlagRow.js'
