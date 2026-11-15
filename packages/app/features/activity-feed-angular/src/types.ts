/**
 * Types of `@molecule/app-activity-feed-angular` — the Angular counterpart of
 * `@molecule/app-activity-feed-react`, same props and DOM.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/** Per-row activity data. */
export interface ActivityFeedItemData {
  /** Row id (the render key). */
  id: string
  /** Actor avatar source URL. */
  avatarSrc?: string
  /** Actor display name. */
  actor: string | number | TemplateRef<unknown>
  /** Verb describing the action ("commented on", "assigned", "completed"). */
  verb: string | number | TemplateRef<unknown>
  /** Object of the action ("the ticket", "Project Alpha", etc.). */
  target?: string | number | TemplateRef<unknown>
  /** Optional supporting body (quote, diff, preview). */
  body?: string | number | TemplateRef<unknown>
  /** ISO timestamp or any node to render as "time ago". */
  timestamp: string | number | TemplateRef<unknown>
  /** Optional leading icon (replaces avatar when present). */
  icon?: string | number | TemplateRef<unknown>
}

/**
 * Props accepted by {@link ActivityFeed} — the same props
 * `@molecule/app-activity-feed-react` accepts. Node props (`emptyState`,
 * `footer`) are projected content in Angular (an input cannot carry a node), or
 * a template reference passed as an input: `[slot=emptyState]` / `[slot=footer]`.
 */
export interface ActivityFeedProps {
  /** Items in display order (usually most-recent first). */
  items: ActivityFeedItemData[]
  /** Rendered when `items` is empty: `[slot=emptyState]` content or a template input. */
  emptyState?: unknown
  /** Optional footer (e.g. "Load more"): `[slot=footer]` content or a template input. */
  footer?: unknown
  /** Extra classes. */
  className?: string
}

/** Props accepted by {@link ActivityFeedItem}. */
export interface ActivityFeedItemProps {
  /** The row to render. */
  item: ActivityFeedItemData
  /** Extra classes on the row wrapper. */
  className?: string
}

/**
 * Props accepted by {@link ActivityFeedGroup} — the same props
 * `@molecule/app-activity-feed-react` accepts. The heading is text, a template
 * reference, or `[slot=heading]` projected content.
 */
export interface ActivityFeedGroupProps {
  /** Group heading — typically a formatted date ("Today", "Yesterday", "Mar 12"). */
  heading?: string | number | TemplateRef<unknown>
  /** Items in this group. */
  items: ActivityFeedItemData[]
  /** Extra classes. */
  className?: string
}
