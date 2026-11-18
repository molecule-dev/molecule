/**
 * Types for the Svelte weekly class-schedule grid.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/**
 * A single event on the weekly schedule grid.
 *
 * `start` and `end` are minute offsets from midnight (`0`–`1440`). For
 * example a class running 09:00–10:30 is `{ start: 540, end: 630 }`.
 */
export interface ScheduleEvent {
  /** Stable identifier (keyed `{#each}` identity + passed to click handlers). */
  id: string
  /** ISO weekday: `0` = Sunday, `1` = Monday … `6` = Saturday. */
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6
  /** Start time in minutes from midnight (e.g. `540` = 09:00). */
  start: number
  /** End time in minutes from midnight (e.g. `630` = 10:30). */
  end: number
  /** Primary label rendered inside the event tile (a snippet, or plain text). */
  title: Snippet | string | number
  /** Secondary line — typically room or location (a snippet, or plain text). */
  subtitle?: Snippet | string | number
  /** Tertiary line — typically teacher or instructor (a snippet, or plain text). */
  meta?: Snippet | string | number
  /** Optional accent color applied as a left border on the tile. */
  accentColor?: string
}

/**
 * Empty-slot click payload — `weekday` plus the start of the clicked hour
 * (in minutes from midnight, snapped down to the row).
 */
export interface ScheduleSlot {
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6
  /** Hour-of-day boundary in minutes (e.g. `540` for the 09:00 row). */
  start: number
}

/** Props for the {@link ClassSchedule} weekly timetable component. */
export interface ClassScheduleProps {
  /** Events to render. */
  events: ScheduleEvent[]
  /** First day-of-week (`0` = Sunday, `1` = Monday). Defaults to `1`. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  /** Visible hour range as `[startHour, endHour]` in 24-hour clock. Defaults to `[8, 18]`. */
  dayHours?: [number, number]
  /** Pixel height of one hour row. Defaults to `60`. */
  cellHeight?: number
  /** Whether to show Saturday + Sunday columns. Defaults to `true`. */
  showWeekendCols?: boolean
  /**
   * Locale for weekday name formatting. Defaults to the app's active locale
   * (`useLocale()`), so the names follow a locale switch; an explicit `locale`
   * still wins.
   */
  locale?: string
  /** Called when an event tile is clicked. */
  onEventClick?: (event: ScheduleEvent) => void
  /** Called when an empty grid cell is clicked. */
  onSlotClick?: (slot: ScheduleSlot) => void
  /** Extra classes for the root container. */
  className?: string
}
