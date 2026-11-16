/**
 * Types for the Solid formatted contact display.
 *
 * The same names `@molecule/app-contact-display-react` exports; node-valued
 * fields take Solid JSX values instead of React nodes.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Fields describing a contact rendered by {@link ContactDisplay}. */
export interface ContactFields {
  /** Display name. */
  name: string
  /** Email address, rendered as a `mailto:` link in the card and row layouts. */
  email?: string
  /** Phone number, rendered as a `tel:` link in the card and row layouts. */
  phone?: string
  /** Role / title, shown beside the name. */
  role?: JSX.Element
  /** Avatar image URL; without one the name's initials are shown. */
  avatarSrc?: string
  /** Postal address, shown under the phone line. */
  address?: JSX.Element
  /** Company name, shown under the name line. */
  company?: JSX.Element
}

/** Props accepted by the {@link ContactDisplay} component. */
export interface ContactDisplayProps {
  /** The contact to display. */
  contact: ContactFields
  /** Layout preset. Defaults to `'card'`. */
  layout?: 'card' | 'row' | 'compact'
  /** Optional right-side actions. */
  actions?: JSX.Element
  /**
   * Activates the contact: the whole row becomes clickable through a
   * transparent native button covering it, named by the contact name (the
   * name span), so Enter and Space activate it natively. The row's inner
   * controls — the mail/tel links and the `actions` slot — sit above that
   * button and keep their own clicks.
   */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}
