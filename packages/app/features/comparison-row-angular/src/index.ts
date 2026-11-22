/**
 * Angular period-over-period stat comparison row — the counterpart of
 * `@molecule/app-comparison-row-react`, with the same props and the same DOM
 * for the same input.
 *
 * Exports `<ComparisonRow>`: current value, optional previous value, and a
 * coloured delta% chip for dashboards, report summaries and finance
 * overviews.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { ComparisonRow } from '@molecule/app-comparison-row-angular'
 *
 * @Component({
 *   selector: 'app-stat',
 *   standalone: true,
 *   imports: [ComparisonRow],
 *   template: `
 *     <div
 *       mol-comparison-row
 *       label="Revenue"
 *       current="$24,800"
 *       previous="$21,300"
 *       [deltaPct]="16.4"
 *       periodLabel="vs. last month"
 *     ></div>
 *   `,
 * })
 * export class Stat {}
 * ```
 *
 * @remarks
 * The delta chip colors by SIGN with fixed semantics: positive = green,
 * negative = red (hardcoded hexes applied inline, not theme tokens). There is
 * no "down-is-good" inversion — for metrics like churn or costs, negate
 * `deltaPct` (and restate the sign in `formatDelta`, which controls the text
 * only, never the color). `label` / `current` / `previous` / `periodLabel`
 * are consumer-provided values — pass pre-formatted, translated values; node
 * content is projected as `[slot=<name>]` content instead of an input. A
 * custom `formatDelta` is an `ng-template` receiving the delta as
 * `$implicit` / `a0`.
 *
 * @module
 */

export * from './comparison-row.component.js'
export * from './types.js'
