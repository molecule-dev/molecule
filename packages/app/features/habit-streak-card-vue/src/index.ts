/**
 * Vue habit / streak summary card — current streak, best streak, total
 * completions, and an optional per-day heatmap strip. Use for habit
 * trackers, meditation streaks, daily-task widgets.
 *
 * Exports `<HabitStreakCard>` and the `StreakDay` / `HabitStreakCardProps`
 * types.
 *
 * @example
 * ```ts
 * import { defineComponent, h } from 'vue'
 * import type { StreakDay } from '@molecule/app-habit-streak-card-vue'
 * import { HabitStreakCard } from '@molecule/app-habit-streak-card-vue'
 *
 * const recentDays: StreakDay[] = [
 *   { date: '2026-07-01', count: 1 },
 *   { date: '2026-07-02', count: 3 },
 * ]
 *
 * const HabitView = defineComponent({
 *   setup() {
 *     return () =>
 *       h(HabitStreakCard, {
 *         name: 'Morning Run',
 *         icon: h('span', '🏃'),
 *         currentStreak: 14,
 *         bestStreak: 30,
 *         totalCompletions: 87,
 *         heatmap: recentDays,
 *       })
 *   },
 * })
 * ```
 *
 * @remarks
 * - Requires the Vue binding's i18n provider (`useTranslation()` THROWS
 *   without it) and a bonded ClassMap for `getClassMap()`. Stat labels come
 *   from the `@molecule/app-locales-habit-streak-card` companion bond.
 * - The heatmap strip uses a fixed green ramp with a light-only zero color
 *   (`rgba(0,0,0,0.08)`) rendered as inline styles — on dark themes the empty
 *   cells are nearly invisible. For a theme-aware year grid use
 *   `@molecule/app-heatmap-vue` with a custom `colorScale` instead.
 * - `heatmapDays` truncates `heatmap` from the END (most recent days win).
 * - The `name` and `icon` props are node-valued: each may be passed as a prop
 *   or as the same-named Vue slot.
 *
 * @module
 */

export * from './HabitStreakCard.js'
export * from './types.js'
