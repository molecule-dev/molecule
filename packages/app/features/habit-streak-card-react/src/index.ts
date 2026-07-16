/**
 * Habit / streak summary card — current streak, best streak, total
 * completions, and an optional per-day heatmap strip. Use for habit
 * trackers, meditation streaks, daily-task widgets.
 *
 * @example
 * ```tsx
 * import type { StreakDay } from '@molecule/app-habit-streak-card-react'
 * import { HabitStreakCard } from '@molecule/app-habit-streak-card-react'
 *
 * const recentDays: StreakDay[] = [
 *   { date: '2026-07-01', count: 1 },
 *   { date: '2026-07-02', count: 3 },
 * ]
 *
 * <HabitStreakCard
 *   name="Morning Run"
 *   icon={<span>🏃</span>}
 *   currentStreak={14}
 *   bestStreak={30}
 *   totalCompletions={87}
 *   heatmap={recentDays}
 * />
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
 * - `heatmapDays` truncates `heatmap` from the END (most recent days win).
 *
 * @module
 */

export * from './HabitStreakCard.js'
