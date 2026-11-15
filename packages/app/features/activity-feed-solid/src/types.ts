/**
 * Types for the Solid activity-feed primitives.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Per-row activity data. */
export interface ActivityFeedItemData {
  /** Row id (the render key). */
  id: string
  /** Actor avatar source URL. */
  avatarSrc?: string
  /** Actor display name. */
  actor: JSX.Element
  /** Verb describing the action ("commented on", "assigned", "completed"). */
  verb: JSX.Element
  /** Object of the action ("the ticket", "Project Alpha", etc.). */
  target?: JSX.Element
  /** Optional supporting body (quote, diff, preview). */
  body?: JSX.Element
  /** ISO timestamp or any node to render as "time ago". */
  timestamp: JSX.Element
  /** Optional leading icon (replaces avatar when present). */
  icon?: JSX.Element
}

/** Props accepted by the {@link ActivityFeed} component. */
export interface ActivityFeedProps {
  /** Items in display order (usually most-recent first). */
  items: ActivityFeedItemData[]
  /** Rendered when `items` is empty. */
  emptyState?: JSX.Element
  /** Optional footer (e.g. "Load more"). */
  footer?: JSX.Element
  /** Extra classes. */
  className?: string
}

/** Props accepted by the {@link ActivityFeedItem} component. */
export interface ActivityFeedItemProps {
  /** The row to render. */
  item: ActivityFeedItemData
  /** Extra classes on the row wrapper. */
  className?: string
}

/** Props accepted by the {@link ActivityFeedGroup} component. */
export interface ActivityFeedGroupProps {
  /** Group heading — typically a formatted date ("Today", "Yesterday", "Mar 12"). */
  heading: JSX.Element
  /** Items in this group. */
  items: ActivityFeedItemData[]
  /** Extra classes. */
  className?: string
}
