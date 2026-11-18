/**
 * Types of `@molecule/app-day-timeline-angular` — the Angular counterpart of
 * `@molecule/app-day-timeline-react`, same props and DOM.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/** A single event positioned on the day axis. */
export interface DayTimelineEvent {
  /** Stable id (used as the render key + `data-event-id`). */
  id: string
  /** Event title: a template reference (a node), or text. */
  title: string | number | TemplateRef<unknown>
  /** Optional secondary line (location, type, etc.): a template reference, or text. */
  subtitle?: string | number | TemplateRef<unknown>
  /** Start hour in fractional 24h (e.g. `9.5` = 9:30 AM). */
  startHour: number
  /** End hour in fractional 24h. Must be > `startHour`. */
  endHour: number
  /** Optional accent color (CSS color value). */
  accentColor?: string
  /** Optional click handler. */
  onClick?: () => void
}

/**
 * Props accepted by {@link DayTimeline} — the same props
 * `@molecule/app-day-timeline-react` accepts. Node-valued event fields
 * (`title`, `subtitle`) are template references in Angular (an input cannot
 * carry a node), or plain text.
 */
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
