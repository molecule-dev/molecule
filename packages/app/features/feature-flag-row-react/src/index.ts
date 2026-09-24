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
 * import { useState } from 'react'
 *
 * import { type FeatureFlag, FeatureFlagRow } from '@molecule/app-feature-flag-row-react'
 * import { patch } from '@molecule/app-http'
 *
 * export function FlagsList() {
 *   const [flags, setFlags] = useState<FeatureFlag[]>([
 *     {
 *       key: 'new-checkout',
 *       name: 'New Checkout Flow',
 *       description: 'Redesigned multi-step checkout experience.',
 *       type: 'percentage',
 *       environments: [
 *         { id: 'staging', label: 'Staging', enabled: true, rolloutPct: 100 },
 *         { id: 'production', label: 'Production', enabled: false, rolloutPct: 20 },
 *       ],
 *     },
 *   ])
 *   function toggle(flagKey: string, envId: string, next: boolean): void {
 *     setFlags((prev) =>
 *       prev.map((f) =>
 *         f.key !== flagKey ? f : { ...f, environments: f.environments.map((e) => (e.id === envId ? { ...e, enabled: next } : e)) },
 *       ),
 *     )
 *     void patch(`/flags/${flagKey}/environments/${envId}`, { enabled: next })
 *   }
 *   return (
 *     <div>
 *       {flags.map((flag) => <FeatureFlagRow key={flag.key} flag={flag} onToggle={toggle} />)}
 *     </div>
 *   )
 * }
 * ```
 *
 * @remarks
 * The row is CONTROLLED and saves nothing: clicking a switch only calls
 * `onToggle(flagKey, envId, next)`. If you don't update the `flag` you pass
 * back in (and persist it yourself, e.g. via `@molecule/app-http`), the
 * switch snaps back. It has no loading/error state and does not evaluate
 * flags — it is an admin-dashboard row, not a runtime flag client.
 *
 * The environment toggle is the `<Switch>` from the
 * `@molecule/app-ui-react` peer dependency (accessible name:
 * `"<flagKey> in <envId>"`). `getClassMap()` throws unless
 * `setClassMap(classMap)` from `@molecule/app-ui` ran at startup, and the
 * row calls `useTranslation()`, so it must render inside `<I18nProvider>` /
 * `<MoleculeProvider>`.
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
