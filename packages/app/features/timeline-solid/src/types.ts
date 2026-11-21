/**
 * Types for the Solid chronological timeline.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** One entry of a `<Timeline>`. */
export interface TimelineEventData {
  /** Stable identifier for this event (the row is keyed by it). */
  id: string
  /** Marker icon / dot — defaults to a small dot. */
  marker?: JSX.Element
  /** Display timestamp (ISO, relative, etc.). */
  timestamp: JSX.Element
  /** Headline of the event. */
  title: JSX.Element
  /** Optional body content. */
  body?: JSX.Element
  /**
   * Optional accent color hint. Currently INERT — no component consumes it,
   * so setting it changes nothing; pass a custom `marker` node to color a row.
   */
  accent?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral'
}

/** Props accepted by the {@link Timeline} component. */
export interface TimelineProps {
  /** Events in display order. */
  events: TimelineEventData[]
  /** Optional renderer for date separators between consecutive events. */
  renderDateSeparator?: (event: TimelineEventData, prev?: TimelineEventData) => JSX.Element
  /** Rendered when there are no events. */
  emptyState?: JSX.Element
  /** Extra classes on the outer wrapper. */
  className?: string
}

/** Props accepted by the {@link TimelineEvent} component. */
export interface TimelineEventProps {
  /** The event to render. */
  event: TimelineEventData
  /** Whether this is the last event in the list (suppresses the connector). */
  isLast?: boolean
  /** Extra classes. */
  className?: string
}

/** Props accepted by the {@link TimelineRail} component. */
export interface TimelineRailProps {
  /** Marker for this row — typically a dot or icon. */
  marker?: JSX.Element
  /** Whether to render the vertical connector below the marker. Defaults to `true`. */
  connector?: boolean
  /** Extra classes on the outer wrapper. */
  className?: string
}

/** Props accepted by the {@link TimelineDate} component. */
export interface TimelineDateProps {
  /** Date label ("Today", "Yesterday", "March 12, 2025"). */
  children: JSX.Element
  /** Extra classes. */
  className?: string
}
