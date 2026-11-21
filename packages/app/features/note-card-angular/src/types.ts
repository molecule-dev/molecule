/**
 * Types of `@molecule/app-note-card-angular` — the Angular counterpart of
 * `@molecule/app-note-card-react`, same props and DOM.
 *
 * @module
 */

/**
 * Props for {@link NoteCard} — the same props
 * `@molecule/app-note-card-react` accepts. Node-valued props (`title`,
 * `body`, `modifiedAt`, `actions`) are projected content in Angular (an
 * input cannot carry a node): pass a string value through the input, and
 * element content in the host template as `[slot=<name>]` content.
 */
export interface NoteCardProps {
  /**
   * Note title. A string or number renders as text; element content is
   * projected as `[slot=title]` content instead.
   */
  title?: unknown
  /**
   * Note body text. A string or number renders as text; element content is
   * projected as `[slot=body]` content instead.
   */
  body?: unknown
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
   * Optional last-modified display. A string or number renders as text;
   * element content is projected as `[slot=modifiedAt]` content instead.
   */
  modifiedAt?: unknown
  /** Optional right-side actions (edit, archive, delete), projected as `[slot=actions]` content. */
  actions?: unknown
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
