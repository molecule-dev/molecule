/**
 * Types of `@molecule/app-habit-streak-card-vue` — the Vue counterpart of
 * `@molecule/app-habit-streak-card-react`, same props and DOM.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Represents a single day's completion data for the heatmap strip. */
export interface StreakDay {
  /** ISO date (yyyy-mm-dd). */
  date: string
  /** Completion count for the day (0 = not done, >0 = intensity). */
  count: number
}

/** Props accepted by the {@link HabitStreakCard} component (React's names). */
export interface HabitStreakCardProps {
  /** Habit name. Passed as a prop or as the same-named slot — both work. */
  name: VNodeChild
  /** Optional leading icon. Passed as a prop or as the same-named slot. */
  icon?: VNodeChild
  /** Current streak (days). */
  currentStreak: number
  /** Best streak (days). */
  bestStreak?: number
  /** Total completions. */
  totalCompletions?: number
  /** Optional heatmap days — rendered as a strip of squares. */
  heatmap?: StreakDay[]
  /** Days the heatmap should display (truncates `heatmap` from the end). Defaults to 30. */
  heatmapDays?: number
  /** Extra classes. */
  className?: string
}
