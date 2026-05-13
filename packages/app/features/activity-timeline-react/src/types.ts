/**
 * Types for the activity-timeline primitives.
 *
 * @module
 */

import type { ReactNode } from 'react'

/**
 * Single event displayed on the timeline. The kind drives the icon and
 * dot colour via the consumer-supplied `iconForKind` map.
 */
export interface TimelineEventData {
  id: string
  kind: string
  title: ReactNode
  description?: ReactNode
  /** ISO timestamp or pre-formatted label. */
  occurredAt?: string
  /** Pre-formatted right-aligned label (e.g. "Mar 5", "2h ago"). */
  meta?: ReactNode
  /** Optional href — when set, the row renders as a link. */
  href?: string
  /** Extra footer content (badges, before/after chips, etc.). */
  footer?: ReactNode
}

/** Visual treatment for a particular event kind. */
export interface TimelineKindTone {
  /** Material-symbols icon name. */
  icon: string
  /** ClassMap-class string applied to the dot background. */
  dotClass?: string
  /** ClassMap-class string applied to the icon. */
  iconClass?: string
}
