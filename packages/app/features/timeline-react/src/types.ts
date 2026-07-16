import type { ReactNode } from 'react'

/**
 * Timeline event types.
 *
 * @module
 */
export interface TimelineEventData {
  id: string
  /** Marker icon / dot — defaults to a small dot. */
  marker?: ReactNode
  /** Display timestamp (ISO, relative, etc.). */
  timestamp: ReactNode
  /** Headline of the event. */
  title: ReactNode
  /** Optional body content. */
  body?: ReactNode
  /**
   * Optional accent color hint. Currently INERT — no component consumes it,
   * so setting it changes nothing; pass a custom `marker` node to color a row.
   */
  accent?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral'
}
