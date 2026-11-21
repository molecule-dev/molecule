/**
 * Types for the Svelte forum / discussion-board thread row.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** Props for {@link ForumThreadRow}. */
export interface ForumThreadRowProps {
  /** Thread title; a node arrives as a same-named snippet. */
  title: Snippet | string
  /** Optional snippet of the OP body; a node arrives as a snippet. */
  excerpt?: Snippet | string
  /** Aggregate vote score / upvotes. */
  voteScore?: number
  /** Reply count. */
  replyCount?: number
  /** View count. */
  viewCount?: number
  /** Optional pinned indicator. */
  pinned?: boolean
  /** Optional locked indicator. */
  locked?: boolean
  /** Author display; a node arrives as a snippet. */
  author?: Snippet | string
  /** Created-at display (relative or absolute); a node arrives as a snippet. */
  createdAt?: Snippet | string
  /** Tag chips; arrive as a snippet. */
  tags?: Snippet | string
  /** Right-side voting controls slot; arrives as a snippet. */
  voteControls?: Snippet | string
  /**
   * Activates the row: the whole row is clickable through a transparent native
   * button laid over it (Enter and Space activate it natively), named by the
   * title — the `<h3>` itself takes the generated id. The `voteControls` and
   * `tags` slots sit above that button and keep their own clicks.
   */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}
