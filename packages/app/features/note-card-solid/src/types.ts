/**
 * Types for the Solid sticky-note style card.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Props for {@link NoteCard}. */
export interface NoteCardProps {
  /** Note title. */
  title?: JSX.Element
  /** Note body text. */
  body: JSX.Element
  /** Background tint (CSS color). */
  color?: string
  /** Optional pin / starred indicator. */
  pinned?: boolean
  /** Optional last-modified display. */
  modifiedAt?: JSX.Element
  /** Optional right-side actions (edit, archive, delete). */
  actions?: JSX.Element
  /** Click handler; receives the DOM click event. */
  onClick?: (event: MouseEvent) => void
  /** Extra classes. */
  className?: string
}
