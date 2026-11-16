/**
 * Types for the Vue formatted contact display.
 *
 * The same names `@molecule/app-contact-display-react` exports; node-valued
 * fields take Vue nodes instead of React nodes.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Fields describing a contact rendered by {@link ContactDisplay}. */
export interface ContactFields {
  /** Display name. */
  name: string
  /** Email address, rendered as a `mailto:` link in the card and row layouts. */
  email?: string
  /** Phone number, rendered as a `tel:` link in the card and row layouts. */
  phone?: string
  /** Role / title, shown beside the name. */
  role?: VNodeChild
  /** Avatar image URL; without one the name's initials are shown. */
  avatarSrc?: string
  /** Postal address, shown under the phone line. */
  address?: VNodeChild
  /** Company name, shown under the name line. */
  company?: VNodeChild
}

/** Props accepted by the {@link ContactDisplay} component. */
export interface ContactDisplayProps {
  /** The contact to display. */
  contact: ContactFields
  /** Layout preset. Defaults to `'card'`. */
  layout?: 'card' | 'row' | 'compact'
  /** Optional right-side actions — passed as a prop or as the `actions` slot. */
  actions?: VNodeChild
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
