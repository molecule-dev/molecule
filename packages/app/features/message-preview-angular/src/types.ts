/**
 * Types of `@molecule/app-message-preview-angular` — the Angular counterpart of
 * `@molecule/app-message-preview-react`, same props and DOM.
 *
 * @module
 */

/** Presence state of the contact shown in the avatar dot. */
export type MessagePreviewPresence = 'online' | 'away' | 'offline'

/**
 * Props accepted by {@link MessagePreview} — the same props
 * `@molecule/app-message-preview-react` accepts. Node props (`name`, `preview`,
 * `timestamp`) are projected content in Angular (an input cannot carry a node)
 * or a `TemplateRef` built by a parent template, so they are typed `unknown`:
 * pass them in the host template, not as values.
 */
export interface MessagePreviewProps {
  /** Contact display name (`[slot=name]` projection, a `TemplateRef`, or a string). */
  name?: unknown
  /** Last-message preview line (`[slot=preview]` projection, a `TemplateRef`, or a string). */
  preview?: unknown
  /** Display timestamp, rendered verbatim (`[slot=timestamp]` projection, a `TemplateRef`, or a string). */
  timestamp?: unknown
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
  /**
   * Click handler — typically opens the conversation; receives the native click
   * event, and is also fired with no event on Enter / Space.
   */
  onClick?: (event?: Event) => void
  /** Accessible label for the unread pip (defaults to English "`N` unread"). */
  unreadAriaLabel?: string
  /** Extra classes on the outer wrapper. */
  className?: string
}
