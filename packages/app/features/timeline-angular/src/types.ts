/**
 * Types of `@molecule/app-timeline-angular` — the Angular counterpart of
 * `@molecule/app-timeline-react`, same props and DOM.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/**
 * One entry of a `<Timeline>`. Node fields are `ng-template` references (a
 * projected node) or plain text, since an input cannot carry a DOM node.
 */
export interface TimelineEventData {
  /** Stable identifier for this event (the row is tracked by it, like React's key). */
  id: string
  /** Marker icon / dot — defaults to a small dot. */
  marker?: string | number | TemplateRef<unknown>
  /** Display timestamp (ISO, relative, etc.). */
  timestamp: string | number | TemplateRef<unknown>
  /** Headline of the event. */
  title: string | number | TemplateRef<unknown>
  /** Optional body content. */
  body?: string | number | TemplateRef<unknown>
  /**
   * Optional accent color hint. Currently INERT — no component consumes it,
   * so setting it changes nothing; pass a custom `marker` node to color a row.
   */
  accent?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral'
}

/**
 * Props accepted by {@link Timeline} — the same props
 * `@molecule/app-timeline-react` accepts. `emptyState` is a template reference
 * passed as an input (or projected content in a host template); the callback
 * prop `renderDateSeparator` is a template reference whose context carries the
 * event as `$implicit` / `a0` and its predecessor as `a1`.
 */
export interface TimelineProps {
  /** Events in display order. */
  events: TimelineEventData[]
  /** Optional renderer for date separators between consecutive events. */
  renderDateSeparator?: TemplateRef<unknown>
  /** Rendered when there are no events. */
  emptyState?: string | number | TemplateRef<unknown>
  /** Extra classes on the outer wrapper. */
  className?: string
}

/**
 * Props accepted by {@link TimelineEvent} — the same props
 * `@molecule/app-timeline-react` accepts.
 */
export interface TimelineEventProps {
  /** The event to render. */
  event: TimelineEventData
  /** Whether this is the last event in the list (suppresses the connector). */
  isLast?: boolean
  /** Extra classes. */
  className?: string
}

/**
 * Props accepted by {@link TimelineRail} — the same props
 * `@molecule/app-timeline-react` accepts.
 */
export interface TimelineRailProps {
  /** Marker for this row — typically a dot or icon. */
  marker?: string | number | TemplateRef<unknown>
  /** Whether to render the vertical connector below the marker. Defaults to `true`. */
  connector?: boolean
  /** Extra classes on the outer wrapper. */
  className?: string
}

/**
 * Props accepted by {@link TimelineDate} — the same props
 * `@molecule/app-timeline-react` accepts. `children` is projected content in
 * Angular (an input cannot carry a node), so it is typed `unknown`: pass it in
 * the host template, not as a value.
 */
export interface TimelineDateProps {
  /** Date label ("Today", "Yesterday", "March 12, 2025"), as projected content. */
  children?: unknown
  /** Extra classes. */
  className?: string
}
