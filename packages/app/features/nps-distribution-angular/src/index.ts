/**
 * Angular Net Promoter Score distribution chart — the counterpart of
 * `@molecule/app-nps-distribution-react`: the same props (React names) and the
 * same DOM for the same input.
 *
 * Exports `<NpsDistribution>` — 11-row 0..10 horizontal bar chart with
 * detractor / passive / promoter color tiers and an optional computed NPS
 * score line. The host IS the outer `<div>` (`div[mol-nps-distribution]`), so
 * its classes, `role` and `aria-label` match React's root exactly.
 *
 * The pure helper `computeNps(scores, detractorMax?, passiveMax?)` is
 * also exported so callers can run the math without rendering.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { NpsDistribution } from '@molecule/app-nps-distribution-angular'
 *
 * @Component({
 *   selector: 'app-results',
 *   standalone: true,
 *   imports: [NpsDistribution],
 *   template: `<div mol-nps-distribution [scores]="scores"></div>`,
 * })
 * export class Results {
 *   scores = [10, 9, 9, 7, 6, 0, 8, 10]
 * }
 * ```
 *
 * @remarks
 * Bar widths scale relative to the tallest bucket. Color tiers map to
 * the semantic ClassMap CSS custom properties
 * (`--mol-color-error|warning|success`) so the chart re-themes
 * automatically when the ClassMap bond is swapped. All user-facing text
 * goes through `t()` with companion locale bond
 * `@molecule/app-locales-nps-distribution`. A wired ClassMap bond is
 * required — `getClassMap()` throws before wiring. Text resolves through
 * `useTranslation()` from `@molecule/app-angular`, so the chart re-renders on
 * a live locale switch.
 *
 * @module
 */

export * from './computeNps.js'
export * from './nps-distribution.component.js'
export * from './types.js'
