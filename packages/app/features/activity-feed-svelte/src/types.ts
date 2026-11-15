/**
 * Types for the Svelte activity-feed primitives.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** Per-row activity data. */
export interface ActivityFeedItemData {
  /** Row id (the render key). */
  id: string
  /** Actor avatar source URL. */
  avatarSrc?: string
  /** Actor display name (a snippet, or plain text). */
  actor: Snippet | string | number
  /** Verb describing the action ("commented on", "assigned", "completed"; a snippet, or plain text). */
  verb: Snippet | string | number
  /** Object of the action ("the ticket", "Project Alpha", etc.; a snippet, or plain text). */
  target?: Snippet | string | number
  /** Optional supporting body (quote, diff, preview; a snippet, or plain text). */
  body?: Snippet | string | number
  /** ISO timestamp or any node to render as "time ago" (a snippet, or plain text). */
  timestamp: Snippet | string | number
  /** Optional leading icon, replacing the avatar (a snippet, or plain text). */
  icon?: Snippet | string | number
}

/** Props accepted by the {@link ActivityFeed} component. */
export interface ActivityFeedProps {
  /** Items in display order (usually most-recent first). */
  items: ActivityFeedItemData[]
  /** Rendered when `items` is empty. */
  emptyState?: Snippet
  /** Optional footer (e.g. "Load more"). */
  footer?: Snippet
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
  /**
   * Group heading — typically a formatted date ("Today", "Yesterday", "Mar 12").
   * A snippet, or plain text.
   */
  heading: Snippet | string | number
  /** Items in this group. */
  items: ActivityFeedItemData[]
  /** Extra classes. */
  className?: string
}
