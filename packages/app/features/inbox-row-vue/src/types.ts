/**
 * Types for the Vue inbox / message-list row.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Props accepted by the {@link InboxRow} component. */
export interface InboxRowProps {
  /**
   * Sender display. Passed as a prop or as the same-named slot — both work;
   * a plain string also names the avatar's image.
   */
  sender: VNodeChild
  /** Avatar URL fallback for sender. */
  senderAvatarSrc?: string
  /** Subject / headline. Passed as a prop or as the same-named slot. */
  subject: VNodeChild
  /** Preview / first line of body (a prop or the `preview` slot). */
  preview?: VNodeChild
  /** Display timestamp (a prop or the `timestamp` slot). */
  timestamp?: VNodeChild
  /** Whether the message is unread (drives bold + dot). */
  unread?: boolean
  /** Whether the message is starred / flagged. */
  starred?: boolean
  /** Optional attachment indicator. */
  hasAttachment?: boolean
  /** Optional labels / tags chip row (a prop or the `labels` slot). */
  labels?: VNodeChild
  /** Right-side selection slot (checkbox) — a prop or the `selectionSlot` slot. */
  selectionSlot?: VNodeChild
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
