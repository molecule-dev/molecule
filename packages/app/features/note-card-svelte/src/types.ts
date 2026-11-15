/**
 * Types for the Svelte sticky-note style card.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** Props for {@link NoteCard}. */
export interface NoteCardProps {
  /**
   * Note title. A string renders as text; a node arrives as a same-named
   * snippet.
   */
  title?: Snippet | string
  /** Note body text; a node arrives as a snippet. */
  body: Snippet | string
  /** Background tint (CSS color). */
  color?: string
  /** Optional pin / starred indicator. */
  pinned?: boolean
  /**
   * Optional last-modified display. A string renders as text; a node arrives
   * as a snippet.
   */
  modifiedAt?: Snippet | string
  /** Optional right-side actions (edit, archive, delete); arrives as a snippet. */
  actions?: Snippet
  /** Click handler. */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}
