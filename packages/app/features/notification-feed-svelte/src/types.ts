/**
 * Types for the Svelte notification feed.
 *
 * Svelte counterpart of `@molecule/app-notification-feed-react`'s prop types —
 * the same fields, under the same names.
 *
 * @module
 */

/**
 * A single item rendered inside a NotificationFeed list.
 */
export interface FeedItem {
  /** Stable identifier (used as the row's key). */
  id: string
  /** Material symbol icon name (e.g. `'check_circle'`, `'chat'`). */
  icon: string
  /** Bolded headline string. */
  title: string
  /** Secondary body string. */
  body: string
  /** ISO timestamp shown as relative time on the right. */
  createdAt: string
  /** Optional route — when set, wraps the row in a link. */
  href?: string | null
  /** When true, the row gets a left primary-accent border. */
  unread?: boolean
}

/**
 * Props for the NotificationFeed component.
 */
export interface NotificationFeedProps {
  /** Items to render, top to bottom. */
  items: ReadonlyArray<FeedItem>
  /** Aria-label for the underlying `<ul>`. */
  ariaLabel?: string
  /** Extra classes on the outer `<ul>`. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
