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
  /** Optional accent color. */
  accent?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral'
}
