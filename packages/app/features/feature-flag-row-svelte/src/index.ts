/**
 * Svelte feature-flag list row — flag name + type badge + key + description on
 * the left, one labelled `<Switch>` per environment (with a rollout-%
 * readout for percentage flags) on the right. Stack rows inside a list or
 * table to build a flags dashboard.
 *
 * Exports `FeatureFlagRow` and the `FeatureFlag`, `FeatureFlagEnvironment`,
 * and `FlagType` types. It is the Svelte counterpart of
 * `@molecule/app-feature-flag-row-react`: the same props (React names) and the
 * same DOM for the same input.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { FeatureFlagRow } from '@molecule/app-feature-flag-row-svelte'
 *
 *   const flag = {
 *     key: 'new-checkout',
 *     name: 'New Checkout Flow',
 *     description: 'Redesigned multi-step checkout experience.',
 *     type: 'percentage' as const,
 *     environments: [
 *       { id: 'staging', label: 'Staging', enabled: true, rolloutPct: 100 },
 *       { id: 'production', label: 'Production', enabled: true, rolloutPct: 20 },
 *     ],
 *   }
 * </script>
 *
 * <FeatureFlagRow {flag} onToggle={(key, envId, next) => updateFlag(key, envId, next)} />
 * ```
 *
 * @remarks
 * The environment toggle is the `<Switch>` from the `@molecule/app-ui-svelte`
 * peer dependency — that package must be installed and its ClassMap bond
 * wired for the row to render styled.
 *
 * `rolloutPct` is displayed only when `flag.type === 'percentage'`; on other
 * flag types the field is ignored. The row is presentation-only: `onToggle`
 * receives `(flagKey, envId, next)` and the caller persists the change and
 * re-renders with updated `flag` data.
 *
 * The type badge translates via one literal `t('flagType.<type>')` call per
 * flag type (a runtime-built key would be invisible to molecule's i18n gate),
 * with a capitalized English label (`Boolean`, `Multivariate`, `Percentage`,
 * `String`) as the fallback. The environment toggle's `aria-label` translates
 * via `featureFlagRow.aria.flagInEnvironment`. All keys ship in the
 * `@molecule/app-locales-feature-flag-row` companion bond (79 languages).
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
