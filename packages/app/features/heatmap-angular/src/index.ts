/**
 * Angular GitHub-contributions-style year-grid activity heatmap — the
 * counterpart of `@molecule/app-heatmap-react`: the same props and the same
 * DOM for the same input.
 *
 * Exports `Heatmap` — an SVG-based year-grid (or any date range) whose cells
 * encode a per-day value, with month and weekday label rows, a per-cell
 * tooltip / `aria-label`, and click/hover callbacks.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { Heatmap } from '@molecule/app-heatmap-angular'
 *
 * @Component({
 *   selector: 'activity-page',
 *   standalone: true,
 *   imports: [Heatmap],
 *   template: `
 *     <svg
 *       mol-heatmap
 *       [data]="days"
 *       [range]="range"
 *       [onCellClick]="select"
 *     ></svg>
 *   `,
 * })
 * export class ActivityPage {
 *   readonly days = [
 *     { date: '2025-01-15', value: 3 },
 *     { date: '2025-02-04', value: 8 },
 *   ]
 *   readonly range = { start: new Date(2025, 0, 1), end: new Date(2025, 11, 31) }
 *   select = (cell: { date: string; value: number }): void => console.log(cell)
 * }
 * ```
 *
 * @remarks
 * - All UI text routes through `t('heatmap.*')` — drop in
 *   `@molecule/app-locales-heatmap` for translated month / weekday / tooltip
 *   strings. The Angular binding's `useTranslation()` needs a bonded provider,
 *   and `getClassMap()` needs a bonded ClassMap.
 * - The host IS the `<svg>` (`svg[mol-heatmap]`), so the grid inherits the
 *   element's own width/height/viewBox bindings.
 * - The default `'quantile'` palette's zero bucket is `rgba(0,0,0,0.06)` —
 *   near-invisible on dark themes. Dark/theme-aware hosts should pass an
 *   explicit `colorScale` of EXACTLY 5 colors (light → dark); buckets are
 *   fixed at 0-4, so shorter arrays leave cells unfilled.
 * - Weekday gutter labels render every OTHER row (Mon/Wed/Fri pattern), like
 *   GitHub's contribution graph.
 *
 * @module
 */

export * from './heatmap.component.js'
export * from './types.js'
