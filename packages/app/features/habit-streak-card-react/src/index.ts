/**
 * Habit / streak summary card — current streak, best streak, total
 * completions, and an optional per-day heatmap strip. Use for habit
 * trackers, meditation streaks, daily-task widgets.
 *
 * @example
 * ```tsx
 * import { HabitStreakCard, type StreakDay } from '@molecule/app-habit-streak-card-react'
 *
 * export function MorningRunWidget() {
 *   const recentDays: StreakDay[] = [
 *     { date: '2026-07-01', count: 0 },
 *     { date: '2026-07-02', count: 1 },
 *     { date: '2026-07-03', count: 3 },
 *   ]
 *   return (
 *     <HabitStreakCard
 *       name="Morning Run"
 *       icon={<span aria-hidden="true">🏃</span>}
 *       currentStreak={14}
 *       bestStreak={30}
 *       totalCompletions={87}
 *       heatmap={recentDays}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - Requires `@molecule/app-react`'s `I18nProvider` (`useTranslation()` THROWS
 *   without it) and a bonded ClassMap for `getClassMap()`. Stat labels come
 *   from the `@molecule/app-locales-habit-streak-card` companion bond.
 * - The heatmap strip uses a fixed green ramp with a light-only zero color
 *   (`rgba(0,0,0,0.08)`) rendered as inline styles — on dark themes the empty
 *   cells are nearly invisible. For a theme-aware year grid use
 *   `@molecule/app-heatmap-react` with a custom `colorScale` instead.
 * - It is display-only: it does NOT compute streaks from `heatmap` — pass
 *   `currentStreak` (required), `bestStreak` and `totalCompletions` yourself.
 *   `bestStreak` / `totalCompletions` are hidden when omitted.
 * - Cards render inside `Card` from `@molecule/app-ui-react` (a peer dependency).
 * - `heatmapDays` truncates `heatmap` from the END (most recent days win).
 *
 * @module
 */

export * from './HabitStreakCard.js'
