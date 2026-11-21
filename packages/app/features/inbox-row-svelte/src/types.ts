/**
 * Types for the Svelte inbox / message-list row.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/**
 * A node-valued prop: a Svelte snippet (what React renders as an element), or
 * the plain string / number React renders as text.
 */
type InboxRowNode = Snippet | string | number

/** Props accepted by the {@link InboxRow} component. */
export interface InboxRowProps {
  /** Sender display. A plain string also names the avatar's image. */
  sender: InboxRowNode
  /** Avatar URL fallback for sender. */
  senderAvatarSrc?: string
  /** Subject / headline. */
  subject: InboxRowNode
  /** Preview / first line of body. */
  preview?: InboxRowNode
  /** Display timestamp. */
  timestamp?: InboxRowNode
  /** Whether the message is unread (drives bold + dot). */
  unread?: boolean
  /** Whether the message is starred / flagged. */
  starred?: boolean
  /** Optional attachment indicator. */
  hasAttachment?: boolean
  /** Optional labels / tags chip row. */
  labels?: InboxRowNode
  /** Right-side selection slot (checkbox). */
  selectionSlot?: InboxRowNode
  /**
   * Click handler — typically opens the message. While it is set, the whole
   * row is clickable through a transparent native button laid over it, named
   * by the sender and the subject (two ids, `aria-labelledby="<senderId>
   * <subjectId>"`); the inner controls — the star toggle, the selection slot
   * and the labels slot — sit above that button and keep their own clicks.
   */
  onClick?: () => void
  /** Star toggle. */
  onToggleStar?: () => void
  /** Extra classes. */
  className?: string
}
