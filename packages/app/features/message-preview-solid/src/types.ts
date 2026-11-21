/**
 * Types for the Solid conversation / thread row.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Presence state of the contact shown in the avatar dot. */
export type MessagePreviewPresence = 'online' | 'away' | 'offline'

/** Props accepted by the {@link MessagePreview} component. */
export interface MessagePreviewProps {
  /** Contact display name; a plain string derives the initials. */
  name: JSX.Element
  /** Last-message preview line. */
  preview: JSX.Element
  /** Display timestamp, rendered verbatim. */
  timestamp: JSX.Element
  /** Unread count — 0 hides the pip. */
  unread?: number
  /** Presence state of the avatar dot; `null`/absent hides the dot. */
  presence?: MessagePreviewPresence | null
  /** Apply the active-selection treatment instead of the hover treatment. */
  active?: boolean
  /** Material-symbols icon name (e.g. mail / chat / phone) shown ahead of the preview. */
  channelIcon?: string
  /** Override the initials computed from `name`. */
  initials?: string
  /** Optional href; when set, the row renders as a router link. */
  to?: string
  /** Click handler — typically opens the conversation. */
  onClick?: () => void
  /** Accessible label for the unread pip (defaults to English "`N` unread"). */
  unreadAriaLabel?: string
  /** Extra classes on the outer wrapper. */
  className?: string
}
