/**
 * Types for the Solid avatar stack and user chip.
 *
 * @module
 */

import type { JSX } from 'solid-js'

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
export interface UserChipProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Display name. */
  name: string
  /** Profile destination. Only the displayed name becomes a link. */
  href?: string
  /** Name-link attributes and events, including app styling and SPA navigation. */
  nameLinkProps?: Omit<
    JSX.AnchorHTMLAttributes<HTMLAnchorElement>,
    'href' | 'children' | 'innerHTML' | 'textContent'
  > & {
    /** Extra name-link classes (the React-compatible spelling). */
    className?: string
  }
  /** Optional avatar image URL. */
  src?: string
  /** Optional secondary line (role / email / handle). */
  subtitle?: JSX.Element
  /** Optional trailing content (action button, status dot, etc.). */
  trailing?: JSX.Element
  /** Avatar size preset. */
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** Extra classes on the outer row. */
  className?: string
}
