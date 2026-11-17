/**
 * Types for the Vue avatar stack and user chip.
 *
 * @module
 */

import type { AnchorHTMLAttributes, HTMLAttributes, VNodeChild } from 'vue'

/** Represents a single person entry rendered inside an AvatarStack. */
export interface AvatarStackPerson {
  /** Display name (also used to generate the text fallback). */
  name: string
  /** Optional avatar image URL. */
  src?: string
  /** Optional alt text — defaults to `name`. */
  alt?: string
}

/** Props accepted by the {@link AvatarStack} component. */
export interface AvatarStackProps {
  /** People to render. */
  people: AvatarStackPerson[]
  /** Maximum visible avatars. Remaining are summarised in an "overflow" chip. */
  max?: number
  /** Avatar size preset. */
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** Extra classes on the outer stack. */
  className?: string
}

/** Props accepted by the {@link UserChip} component. */
export interface UserChipProps extends HTMLAttributes {
  /** Display name. */
  name: string
  /** Profile destination. Only the displayed name becomes a link. */
  href?: string
  /** Name-link attributes and events; `className` supplements the default name classes. */
  nameLinkProps?: Omit<AnchorHTMLAttributes, 'href' | 'innerHTML' | 'textContent'> & {
    /** Extra name-link classes (the React-compatible spelling). */
    className?: string
  }
  /** Optional avatar image URL. */
  src?: string
  /**
   * Optional secondary line (role / email / handle). Passed as a prop or as the
   * same-named slot — both work.
   */
  subtitle?: VNodeChild
  /**
   * Optional trailing content (action button, status dot, etc.). Passed as a
   * prop or as the same-named slot — both work.
   */
  trailing?: VNodeChild
  /** Avatar size preset. */
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** Extra classes on the outer row. */
  className?: string
}
