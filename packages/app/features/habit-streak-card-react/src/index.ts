/**
 * Habit / streak summary card with heatmap.
 *
 * Exports `<HabitStreakCard>` and `StreakDay` type.
 *
 * @example
 * ```tsx
 * import { HabitStreakCard } from '@molecule/app-habit-streak-card-react'
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
 * @module
 */

export * from './HabitStreakCard.js'
