import type { ReactNode } from 'react'

/**
 * Per-row activity data.
 *
 * @module
 */
export interface ActivityFeedItemData {
  /** Row id (React key). */
  id: string
  /** Actor avatar source URL. */
  avatarSrc?: string
  /** Actor display name. */
  actor: ReactNode
  /** Verb describing the action ("commented on", "assigned", "completed"). */
  verb: ReactNode
  /** Object of the action ("the ticket", "Project Alpha", etc.). */
  target?: ReactNode
  /** Optional supporting body (quote, diff, preview). */
  body?: ReactNode
  /** ISO timestamp or any node to render as "time ago". */
  timestamp: ReactNode
  /** Optional leading icon (replaces avatar when present). */
  icon?: ReactNode
}
