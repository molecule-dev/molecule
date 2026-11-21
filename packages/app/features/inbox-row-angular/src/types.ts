/**
 * Types of `@molecule/app-inbox-row-angular` — the Angular counterpart of
 * `@molecule/app-inbox-row-react`, same props and DOM.
 *
 * @module
 */

/**
 * Props accepted by {@link InboxRow} — the same props
 * `@molecule/app-inbox-row-react` accepts. Node props (`sender`, `subject`,
 * `preview`, `timestamp`, `labels`, `selectionSlot`) are projected content in
 * Angular (an input cannot carry a node) or a `TemplateRef` built by a parent
 * template, so they are typed `unknown`: pass them in the host template, not
 * as values.
 */
export interface InboxRowProps {
  /** Sender display (a `[slot=sender]` projection or a `TemplateRef`); a plain string names the avatar too. */
  sender?: unknown
  /** Avatar URL fallback for sender. */
  senderAvatarSrc?: string
  /** Subject / headline (a `[slot=subject]` projection or a `TemplateRef`). */
  subject?: unknown
  /** Preview / first line of body (a `[slot=preview]` projection or a `TemplateRef`). */
  preview?: unknown
  /** Display timestamp (a `[slot=timestamp]` projection or a `TemplateRef`). */
  timestamp?: unknown
  /** Whether the message is unread (drives bold + dot). */
  unread?: boolean
  /** Whether the message is starred / flagged. */
  starred?: boolean
  /** Optional attachment indicator. */
  hasAttachment?: boolean
  /** Optional labels / tags chip row (a `[slot=labels]` projection or a `TemplateRef`). */
  labels?: unknown
  /** Right-side selection slot (checkbox) — a `[slot=selectionSlot]` projection or a `TemplateRef`. */
  selectionSlot?: unknown
  /**
   * Click handler — typically opens the message, called with no arguments as
   * React's `onClick` is. While it is set, the whole row is clickable through
   * a transparent native button laid over it, named by the sender and the
   * subject (two ids, `aria-labelledby="<senderId> <subjectId>"`); the inner
   * controls — the star toggle, the selection slot and the labels slot — sit
   * above that button and keep their own clicks.
   */
  onClick?: () => void
  /** Star toggle. */
  onToggleStar?: () => void
  /** Extra classes. */
  className?: string
}
