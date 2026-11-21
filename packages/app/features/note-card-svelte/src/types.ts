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
  /**
   * Background tint (CSS colour). The documented note tints (yellow
   * `#fef9c3`, green `#dcfce7`, blue `#dbeafe`, red `#fee2e2`, amber
   * `#fef3c7`) render as the theme's light tint of their tone; a colour
   * with no tone is data, applied as given.
   */
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
  /**
   * Activates the card: while it is set, an empty, transparent native button
   * covers the whole card and calls this on click — Enter and Space included,
   * natively, since the control is a real button. The button is named by the
   * title when there is one, else the body. The card's other controls (the
   * `actions` slot) sit above that button and keep their own clicks, so they
   * do not fire this.
   */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}
