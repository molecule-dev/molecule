/**
 * Types of `@molecule/app-storefront-chrome-svelte` — the Svelte counterparts
 * of `@molecule/app-storefront-chrome-react`'s types, with node-valued props
 * typed as snippets (or plain text).
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** A node value: a snippet, or plain text (not exported — React has no such type). */
type StorefrontNode = Snippet | string | number

/** Describes a navigation link rendered in the storefront header nav bar. */
export interface NavLinkSpec {
  to: string
  label: StorefrontNode
  /** Visually highlights the link as the current page. */
  active?: boolean
  dataMolId?: string
}

/** Describes an icon-button action (e.g. cart, search) shown in the storefront header. */
export interface NavActionSpec {
  to: string
  /** Material-symbols icon name. */
  icon: string
  ariaLabel: string
  /** Optional numeric badge (e.g. cart count). Hidden when <= 0. */
  badgeCount?: number
  dataMolId?: string
}

/** Describes a single item in the storefront header profile dropdown menu. */
export interface ProfileMenuItem {
  to: string
  label: StorefrontNode
  dataMolId?: string
}

/** Describes a single column of links rendered in the storefront footer. */
export interface FooterColumn {
  heading: StorefrontNode
  links: { to: string; label: StorefrontNode }[]
}

/** Props for the `StorefrontAnnouncementBar` component. */
export interface StorefrontAnnouncementBarProps {
  /** The promo message. */
  message: StorefrontNode
  /** Optional call to action, rendered as a router link after the message. */
  cta?: { to: string; label: StorefrontNode }
  /** Extra classes on the bar. */
  className?: string
}

/** Props for the `StorefrontTopNav` component. */
export interface StorefrontTopNavProps {
  /** The brand mark. */
  brand: StorefrontNode
  /** Path the brand link navigates to. Defaults to `'/'`. */
  brandTo?: string
  /** Horizontal nav links. */
  links?: NavLinkSpec[]
  /** Icon-button actions (search, cart, …). */
  actions?: NavActionSpec[]
  /** Whether the visitor is signed in — picks the dropdown menu. */
  isAuthenticated: boolean
  /**
   * Avatar image URL. OPTIONAL enhancement only — the account/sign-in menu
   * always renders so it is reachable without one. When absent the trigger
   * falls back to `profileInitials`, else a default avatar icon.
   */
  profileImageUrl?: string
  /**
   * Uppercase initials shown in the avatar when no `profileImageUrl` is given
   * (e.g. "JD"). Falls back to a default avatar icon when omitted.
   */
  profileInitials?: string
  /** Avatar alt text. Defaults to English "User profile" — pass a translated string. */
  profileImageAlt?: string
  /** Accessible name for the account-menu trigger. Defaults to English "Account menu". */
  accountMenuLabel?: string
  /** Menu items shown when signed in. */
  authedMenu?: ProfileMenuItem[]
  /** Menu items shown when signed out. */
  unauthedMenu?: ProfileMenuItem[]
  /** Called when the sign-out row is clicked. */
  onSignOut?: () => void
  /** Sign-out button label. Defaults to English "Sign Out" — pass a translated string. */
  signOutLabel?: StorefrontNode
  /** Extra classes on the header. */
  className?: string
}

/** Props for the `StorefrontFooter` component. */
export interface StorefrontFooterProps {
  /** The brand mark. */
  brand: StorefrontNode
  /** Optional tagline under the brand. */
  tagline?: StorefrontNode
  /** Columns of links. */
  columns?: FooterColumn[]
  /** The copyright line. */
  copyright: StorefrontNode
  /** Extra classes on the footer. */
  className?: string
}
