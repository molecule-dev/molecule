/**
 * Types of `@molecule/app-habit-streak-card-angular` — the Angular counterpart
 * of `@molecule/app-habit-streak-card-react`, same props and DOM.
 *
 * @module
 */

/** Represents a single day's completion data for the heatmap strip. */
export interface StreakDay {
  /** ISO date (yyyy-mm-dd). */
  date: string
  /** Completion count for the day (0 = not done, >0 = intensity). */
  count: number
}

/**
 * Props accepted by {@link HabitStreakCard} — the same props
 * `@molecule/app-habit-streak-card-react` accepts. Node props (`name`, `icon`)
 * are projected content in Angular (an input cannot carry a node), so they are
 * typed `unknown`: pass them as `[slot=name]` / `[slot=icon]` content, or as
 * plain strings.
 */
export interface HabitStreakCardProps {
  /** Habit name, projected as `[slot=name]` content or a plain string. */
  name: unknown
  /** Optional leading icon, projected as `[slot=icon]` content or a plain string. */
  icon?: unknown
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
  /** Extra classes on the card. */
  className?: string
}
