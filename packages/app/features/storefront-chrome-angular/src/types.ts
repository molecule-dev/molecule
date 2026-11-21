/**
 * Types of `@molecule/app-storefront-chrome-angular` — the Angular counterparts
 * of `@molecule/app-storefront-chrome-react`'s types, same props and DOM.
 * Node-valued props are projected content, or an `ng-template` reference inside
 * a data prop.
 *
 * @module
 */

/** Describes a navigation link rendered in the storefront header nav bar. */
export interface NavLinkSpec {
  to: string
  /** Link content: plain text, or an `ng-template` reference. */
  label?: unknown
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
  /** Item content: plain text, or an `ng-template` reference. */
  label?: unknown
  dataMolId?: string
}

/** Describes a single column of links rendered in the storefront footer. */
export interface FooterColumn {
  /** The column heading: plain text, or an `ng-template` reference. */
  heading?: unknown
  links: { to: string; label?: unknown }[]
}

/** Props for {@link StorefrontAnnouncementBar} (node props are projected content). */
export interface StorefrontAnnouncementBarProps {
  /** The promo message — text, or `[slot=message]` projected content. */
  message?: unknown
  /** Optional call to action, rendered as a router link after the message. */
  cta?: { to: string; label?: unknown }
  /** Extra classes on the bar. */
  className?: string
}

/** Props for {@link StorefrontTopNav} (node props are projected content). */
export interface StorefrontTopNavProps {
  /** The brand mark — text, or `[slot=brand]` projected content. */
  brand?: unknown
  /** Path the brand link navigates to. Defaults to `'/'`. */
  brandTo?: string
  /** Horizontal nav links. */
  links?: NavLinkSpec[]
  /** Icon-button actions (search, cart, …). */
  actions?: NavActionSpec[]
  /** Whether the visitor is signed in — picks the dropdown menu. */
  isAuthenticated?: boolean
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
  /** Sign-out button label — text, or `[slot=signOutLabel]` projected content. */
  signOutLabel?: unknown
  /** Extra classes on the header. */
  className?: string
}

/** Props for {@link StorefrontFooter} (node props are projected content). */
export interface StorefrontFooterProps {
  /** The brand mark — text, or `[slot=brand]` projected content. */
  brand?: unknown
  /** Optional tagline — text, or `[slot=tagline]` projected content. */
  tagline?: unknown
  /** Columns of links. */
  columns?: FooterColumn[]
  /** The copyright line — text, or `[slot=copyright]` projected content. */
  copyright?: unknown
  /** Extra classes on the footer. */
  className?: string
}
