/**
 * Types for the Vue activity-feed primitives.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Per-row activity data. */
export interface ActivityFeedItemData {
  /** Row id (the render key). */
  id: string
  /** Actor avatar source URL. */
  avatarSrc?: string
  /** Actor display name. */
  actor: VNodeChild
  /** Verb describing the action ("commented on", "assigned", "completed"). */
  verb: VNodeChild
  /** Object of the action ("the ticket", "Project Alpha", etc.). */
  target?: VNodeChild
  /** Optional supporting body (quote, diff, preview). */
  body?: VNodeChild
  /** ISO timestamp or any node to render as "time ago". */
  timestamp: VNodeChild
  /** Optional leading icon (replaces avatar when present). */
  icon?: VNodeChild
}

/** Props accepted by the {@link ActivityFeed} component. */
export interface ActivityFeedProps {
  /** Items in display order (usually most-recent first). */
  items: ActivityFeedItemData[]
  /** Rendered when `items` is empty — passed as a prop or as the same-named slot. */
  emptyState?: VNodeChild
  /** Optional footer (e.g. "Load more") — passed as a prop or as the same-named slot. */
  footer?: VNodeChild
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
   * Passed as a prop or as the same-named slot.
   */
  heading: VNodeChild
  /** Items in this group. */
  items: ActivityFeedItemData[]
  /** Extra classes. */
  className?: string
}
