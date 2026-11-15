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
  /** Click handler. */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}
