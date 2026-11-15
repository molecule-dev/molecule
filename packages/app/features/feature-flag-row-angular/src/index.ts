/**
 * Angular feature-flag list row — flag name + type badge + key + description
 * on the left, one labelled `<mol-switch>` per environment (with a rollout-%
 * readout for percentage flags) on the right. Stack rows inside a list or
 * table to build a flags dashboard.
 *
 * Exports `<FeatureFlagRow>` and the `FeatureFlag`,
 * `FeatureFlagEnvironment`, and `FlagType` types. It is the Angular
 * counterpart of `@molecule/app-feature-flag-row-react`: the same props (React
 * names) and the same DOM for the same input.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { FeatureFlagRow } from '@molecule/app-feature-flag-row-angular'
 *
 * @Component({
 *   selector: 'app-flags-list',
 *   standalone: true,
 *   imports: [FeatureFlagRow],
 *   template: `
 *     <div
 *       mol-feature-flag-row
 *       [flag]="flag"
 *       [onToggle]="onToggle"
 *     ></div>
 *   `,
 * })
 * export class FlagsList {
 *   flag = {
 *     key: 'new-checkout',
 *     name: 'New Checkout Flow',
 *     description: 'Redesigned multi-step checkout experience.',
 *     type: 'percentage',
 *     environments: [
 *       { id: 'staging', label: 'Staging', enabled: true, rolloutPct: 100 },
 *       { id: 'production', label: 'Production', enabled: true, rolloutPct: 20 },
 *     ],
 *   }
 *   onToggle = (key: string, envId: string, next: boolean): void => updateFlag(key, envId, next)
 * }
 * ```
 *
 * @remarks
 * The environment toggle is the `<mol-switch>` from the
 * `@molecule/app-ui-angular` peer dependency — that package must be installed
 * and its ClassMap bond wired for the row to render styled.
 *
 * `rolloutPct` is displayed only when `flag.type === 'percentage'`; on other
 * flag types the field is ignored. The row is presentation-only: `onToggle`
 * receives `(flagKey, envId, next)` and the caller persists the change and
 * re-renders with updated `flag` data.
 *
 * Node-valued fields (`name`, `description`, `environments[].label`) are
 * strings or projected templates.
 *
 * The type badge translates via `t('flagType.<type>')` with a capitalized
 * English label (`Boolean`, `Multivariate`, `Percentage`, `String`) as the
 * fallback. No locale bond currently ships `flagType.*` keys — add them to
 * your app's own locale resources for non-English UIs.
 *
 * @module
 */

export * from './feature-flag-row.component.js'
export * from './types.js'
