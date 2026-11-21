/**
 * Types for the Solid inbox / message-list row.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Props accepted by the {@link InboxRow} component. */
export interface InboxRowProps {
  /** Sender display (React's `sender`: any Solid JSX child). */
  sender: JSX.Element
  /** Avatar URL fallback for sender. */
  senderAvatarSrc?: string
  /** Subject / headline. */
  subject: JSX.Element
  /** Preview / first line of body. */
  preview?: JSX.Element
  /** Display timestamp. */
  timestamp?: JSX.Element
  /** Whether the message is unread (drives bold + dot). */
  unread?: boolean
  /** Whether the message is starred / flagged. */
  starred?: boolean
  /** Optional attachment indicator. */
  hasAttachment?: boolean
  /** Optional labels / tags chip row. */
  labels?: JSX.Element
  /** Right-side selection slot (checkbox). */
  selectionSlot?: JSX.Element
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
