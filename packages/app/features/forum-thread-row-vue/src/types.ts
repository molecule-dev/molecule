/**
 * Types for the Vue forum / discussion-board thread row.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Props for {@link ForumThreadRow}. */
export interface ForumThreadRowProps {
  /** Thread title. */
  title: VNodeChild
  /** Optional snippet of the OP body. */
  excerpt?: VNodeChild
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
  author?: VNodeChild
  /** Created-at display (relative or absolute). */
  createdAt?: VNodeChild
  /** Tag chips. */
  tags?: VNodeChild
  /** Right-side voting controls slot. */
  voteControls?: VNodeChild
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
