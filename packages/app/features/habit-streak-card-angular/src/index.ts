/**
 * Angular habit / streak summary card — the counterpart of
 * `@molecule/app-habit-streak-card-react`: the same props and the same DOM for
 * the same input.
 *
 * Exports `<HabitStreakCard>` — current streak, best streak, total completions,
 * and an optional per-day heatmap strip. Use for habit trackers, meditation
 * streaks, daily-task widgets.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { HabitStreakCard } from '@molecule/app-habit-streak-card-angular'
 *
 * @Component({
 *   selector: 'app-habit',
 *   standalone: true,
 *   imports: [HabitStreakCard],
 *   template: `
 *     <div
 *       mol-habit-streak-card
 *       [currentStreak]="14"
 *       [bestStreak]="30"
 *       [totalCompletions]="87"
 *       [heatmap]="recentDays"
 *     >
 *       <strong slot="name">Morning Run</strong>
 *       <span slot="icon">🏃</span>
 *     </div>
 *   `,
 * })
 * export class HabitView {
 *   recentDays = [
 *     { date: '2026-07-01', count: 1 },
 *     { date: '2026-07-02', count: 3 },
 *   ]
 * }
 * ```
 *
 * @remarks
 * - Requires the Angular binding's i18n provider (`useTranslation()` THROWS
 *   without it) and a bonded ClassMap for `getClassMap()`. Stat labels come
 *   from the `@molecule/app-locales-habit-streak-card` companion bond.
 * - The heatmap strip uses a fixed green ramp with a light-only zero color
 *   (`rgba(0,0,0,0.08)`) rendered as inline styles — on dark themes the empty
 *   cells are nearly invisible. For a theme-aware year grid use
 *   `@molecule/app-heatmap-angular` with a custom `colorScale` instead.
 * - `heatmapDays` truncates `heatmap` from the END (most recent days win).
 * - Node props are projected content: `name` and `icon` are selected by
 *   `[slot=name]` / `[slot=icon]`, or passed as plain string inputs.
 *
 * @module
 */

export * from './habit-streak-card.component.js'
export * from './types.js'
