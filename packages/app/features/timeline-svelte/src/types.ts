/**
 * Types for the Svelte chronological timeline.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** One entry of a `<Timeline>`. Node fields may be plain text or a snippet. */
export interface TimelineEventData {
  /** Stable identifier for this event (the row is keyed by it). */
  id: string
  /** Marker icon / dot — defaults to a small dot. */
  marker?: string | number | Snippet
  /** Display timestamp (ISO, relative, etc.). */
  timestamp: string | number | Snippet
  /** Headline of the event. */
  title: string | number | Snippet
  /** Optional body content. */
  body?: string | number | Snippet
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
  renderDateSeparator?: Snippet<[TimelineEventData, TimelineEventData | undefined]>
  /** Rendered when there are no events. */
  emptyState?: string | number | Snippet
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
  marker?: string | number | Snippet
  /** Whether to render the vertical connector below the marker. Defaults to `true`. */
  connector?: boolean
  /** Extra classes on the outer wrapper. */
  className?: string
}

/** Props accepted by the {@link TimelineDate} component. */
export interface TimelineDateProps {
  /** Date label ("Today", "Yesterday", "March 12, 2025"). */
  children: Snippet
  /** Extra classes. */
  className?: string
}
