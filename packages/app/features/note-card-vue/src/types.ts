/**
 * Types for the Vue sticky-note style card.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Props for {@link NoteCard}. */
export interface NoteCardProps {
  /**
   * Note title. A string renders as text; a node is passed as a prop or as
   * the same-named slot — both work.
   */
  title?: VNodeChild
  /** Note body text. */
  body: VNodeChild
  /** Background tint (CSS color). */
  color?: string
  /** Optional pin / starred indicator. */
  pinned?: boolean
  /**
   * Optional last-modified display. A string renders as text; a node is
   * passed as a prop or as the same-named slot — both work.
   */
  modifiedAt?: VNodeChild
  /** Optional right-side actions (edit, archive, delete). */
  actions?: VNodeChild
  /** Click handler. */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}
