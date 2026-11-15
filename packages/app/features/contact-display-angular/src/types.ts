/**
 * Types for the Angular formatted contact display.
 *
 * The same names `@molecule/app-contact-display-react` exports; node-valued
 * fields arrive as `TemplateRef`s (an input cannot carry a node) or as text.
 *
 * @module
 */

/**
 * Fields describing a contact rendered by {@link ContactDisplay}.
 *
 * `role`, `address` and `company` are node-valued in React: pass a
 * `TemplateRef` (the kit's form) or plain text.
 */
export interface ContactFields {
  /** Display name. */
  name: string
  /** Email address, rendered as a `mailto:` link in the card and row layouts. */
  email?: string
  /** Phone number, rendered as a `tel:` link in the card and row layouts. */
  phone?: string
  /** Role / title, shown beside the name: a `TemplateRef` or text. */
  role?: unknown
  /** Avatar image URL; without one the name's initials are shown. */
  avatarSrc?: string
  /** Postal address, shown under the phone line: a `TemplateRef` or text. */
  address?: unknown
  /** Company name, shown under the name line: a `TemplateRef` or text. */
  company?: unknown
}

/** Props accepted by the {@link ContactDisplay} component. */
export interface ContactDisplayProps {
  /** The contact to display. */
  contact: ContactFields
  /** Layout preset. Defaults to `'card'`. */
  layout?: 'card' | 'row' | 'compact'
  /** Optional right-side actions, projected as `[slot=actions]` content. */
  actions?: unknown
  /** Click handler on the row, called with the native click event. */
  onClick?: (event: MouseEvent) => void
  /** Extra classes. */
  className?: string
}
