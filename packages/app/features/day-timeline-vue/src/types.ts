/**
 * Types for the Vue day-of-events timeline — the Vue counterpart of
 * `@molecule/app-day-timeline-react`'s public types, with Vue nodes where React
 * has `ReactNode`.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** A single event positioned on the day axis. */
export interface DayTimelineEvent {
  /** Stable id (used as the render key + `data-event-id`). */
  id: string
  /** Event title (a VNode, or plain text). */
  title: VNodeChild
  /** Optional secondary line (location, type, etc.: a VNode, or plain text). */
  subtitle?: VNodeChild
  /** Start hour in fractional 24h (e.g. `9.5` = 9:30 AM). */
  startHour: number
  /** End hour in fractional 24h. Must be > `startHour`. */
  endHour: number
  /** Optional accent color (CSS color value). */
  accentColor?: string
  /** Optional click handler. */
  onClick?: () => void
}

/** Props for {@link DayTimeline}. */
export interface DayTimelineProps {
  /** Events to render on the timeline. */
  events: DayTimelineEvent[]
  /** First hour rendered (inclusive). Defaults to `0`. */
  startHour?: number
  /** Last hour rendered (exclusive). Defaults to `24`. */
  endHour?: number
  /**
   * Pixel height per hour. Drives the overall axis size: total height =
   * `(endHour - startHour) * pxPerHour`. Defaults to `60`.
   */
  pxPerHour?: number
  /**
   * Whether to render the axis tick labels (e.g. "9 AM"). Defaults to
   * `true`.
   */
  showAxisLabels?: boolean
  /** `data-mol-id` attribute for AI-agent selectors. */
  dataMolId?: string
  /** Extra classes appended via the ClassMap `cn()` helper. */
  className?: string
}
