/**
 * Types for the Svelte formatted contact display.
 *
 * The same names `@molecule/app-contact-display-react` exports; node-valued
 * fields take Svelte snippets (or plain text) instead of React nodes.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** A node-valued field: a snippet (the caller's slot), or plain text. */
type NodeProp = Snippet | string

/** Fields describing a contact rendered by {@link ContactDisplay}. */
export interface ContactFields {
  /** Display name. */
  name: string
  /** Email address, rendered as a `mailto:` link in the card and row layouts. */
  email?: string
  /** Phone number, rendered as a `tel:` link in the card and row layouts. */
  phone?: string
  /** Role / title, shown beside the name. */
  role?: NodeProp
  /** Avatar image URL; without one the name's initials are shown. */
  avatarSrc?: string
  /** Postal address, shown under the phone line. */
  address?: NodeProp
  /** Company name, shown under the name line. */
  company?: NodeProp
}

/** Props accepted by the {@link ContactDisplay} component. */
export interface ContactDisplayProps {
  /** The contact to display. */
  contact: ContactFields
  /** Layout preset. Defaults to `'card'`. */
  layout?: 'card' | 'row' | 'compact'
  /** Optional right-side actions. */
  actions?: NodeProp
  /** Click handler on the row. */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}
