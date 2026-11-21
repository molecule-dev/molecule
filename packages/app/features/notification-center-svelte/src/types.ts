/**
 * Types for the Svelte notification center.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/**
 * A node-valued field: a snippet (how a node prop arrives in Svelte), or plain
 * text.
 */
type NodeValue = Snippet | string | number

/** A single notification entry rendered inside the notification panel. */
export interface NotificationItem {
  id: string
  title: NodeValue
  body?: NodeValue
  /** Display timestamp. */
  timestamp?: NodeValue
  /** Optional leading icon / avatar. */
  leading?: NodeValue
  /** Whether the user has read this. */
  read?: boolean
  /** Click handler — typically navigates and marks as read. Receives the click event. */
  onClick?: (event?: MouseEvent) => void
}

/** Props accepted by the {@link NotificationCenter} component (the same React prop names). */
export interface NotificationCenterProps {
  /** Items to render. */
  items: NotificationItem[]
  /** Called when "Mark all as read" is clicked. Hides the link if omitted. */
  onMarkAllRead?: () => void
  /** Called when "View all" is clicked. */
  onViewAll?: () => void
  /** Empty-state node when items is empty — a snippet (or plain text). */
  emptyState?: NodeValue
  /** Title at the top of the panel — a snippet (or plain text). */
  title?: NodeValue
  /** Extra classes on the panel wrapper. */
  className?: string
  /**
   * The error from the most recent failed fetch (mirrors
   * `NotificationCenterState.lastError` from `@molecule/app-notification-center`).
   * When set, an error banner with a retry action renders above the list —
   * a stale-but-populated `items` list with a currently-failing background
   * poll must still surface the failure, so the banner never replaces the
   * list or the empty state.
   */
  lastError?: Error
  /**
   * Called when the user clicks "Retry" in the error banner. Typically
   * wired to the notification center instance's `refresh()`.
   */
  onRetry?: () => void
}
