/**
 * Types for the Vue conversation / thread row.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Presence state of the contact shown in the avatar dot. */
export type MessagePreviewPresence = 'online' | 'away' | 'offline'

/** Props accepted by the {@link MessagePreview} component. */
export interface MessagePreviewProps {
  /** Contact display name. A prop or the same-named slot; a plain string derives the initials. */
  name: VNodeChild
  /** Last-message preview line (a prop or the same-named slot). */
  preview: VNodeChild
  /** Display timestamp, rendered verbatim (a prop or the same-named slot). */
  timestamp: VNodeChild
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
