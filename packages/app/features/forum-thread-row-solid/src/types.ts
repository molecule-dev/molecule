/**
 * Types for the Solid forum / discussion-board thread row.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Props for {@link ForumThreadRow}. */
export interface ForumThreadRowProps {
  /** Thread title. */
  title: JSX.Element
  /** Optional snippet of the OP body. */
  excerpt?: JSX.Element
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
  /** Author display. */
  author?: JSX.Element
  /** Created-at display (relative or absolute). */
  createdAt?: JSX.Element
  /** Tag chips. */
  tags?: JSX.Element
  /** Right-side voting controls slot. */
  voteControls?: JSX.Element
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
