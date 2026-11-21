/**
 * Types of `@molecule/app-nav-chrome-svelte` — the Svelte counterpart of
 * `@molecule/app-nav-chrome-react`, same props and DOM. Node-valued props
 * are snippets (or plain strings).
 *
 * @module
 */

import type { Snippet } from 'svelte'

/**
 * Nav item shape shared by the top/side/bottom nav shells.
 *
 * @module
 */
export interface NavItem {
  /** Unique id (the list key + active-state matcher). */
  id: string
  /** Display label. */
  label: Snippet | string
  /** Optional leading icon. */
  icon?: Snippet | string
  /**
   * Route target. The shells do NOT render links — every item renders a
   * button and navigation is delegated to `onItemClick`. `to` is carried
   * through untouched for exactly that purpose.
   */
  to?: string
  /** Optional badge / count to the right of the label. */
  badge?: Snippet | string
  /** When true, the item is rendered in a disabled visual state. */
  disabled?: boolean
}

/**
 * A labeled group of {@link NavItem}s rendered as a section in the side nav.
 */
export interface NavGroup {
  /** Group id. */
  id: string
  /** Optional heading above the group. */
  heading?: Snippet | string
  /** Items in this group. */
  items: NavItem[]
}

/** A single navigable link rendered in the footer link row. */
export interface FooterLink {
  /** Link text. */
  label: Snippet | string
  /** `href` target; defaults to `#`. */
  to?: string
}

/** Props for {@link AppShellTopNav}. */
export interface AppShellTopNavProps {
  /** Left-side brand / logo slot. */
  logo?: Snippet | string
  /** Centre nav items (usually the primary app sections). */
  items?: NavItem[]
  /** Which item is currently active (by `id`). */
  activeId?: string
  /** Called when an item is clicked (hand off to your router). */
  onItemClick?: (item: NavItem) => void
  /** Right-side slot — user menu, notifications, theme toggle, etc. */
  right?: Snippet | string
  /** Extra classes. */
  className?: string
}

/** Props for {@link AppShellBottomNav}. */
export interface AppShellBottomNavProps {
  /** Tab items (typically 3–5 primary destinations). */
  items: NavItem[]
  /** Which item is currently active (by `id`). */
  activeId?: string
  /** Called when an item is clicked. */
  onItemClick?: (item: NavItem) => void
  /** Extra classes. */
  className?: string
}

/** Props for {@link AppShellSideNav}. */
export interface AppShellSideNavProps {
  /** Nav content: either a flat list of items or grouped sections. */
  items?: NavItem[]
  /** Grouped nav sections. */
  groups?: NavGroup[]
  /** Active item id. */
  activeId?: string
  /** Called when a nav item is clicked. */
  onItemClick?: (item: NavItem) => void
  /** Optional header slot (logo, workspace switcher). */
  header?: Snippet | string
  /** Optional footer slot (theme toggle, sign-out). */
  footer?: Snippet | string
  /** Extra classes. */
  className?: string
}

/** Props for {@link AppShellFooter}. */
export interface AppShellFooterProps {
  /** Optional brand / logo. */
  logo?: Snippet | string
  /** Optional copyright text. */
  copyright?: Snippet | string
  /** Footer links — rendered in a row. */
  links?: FooterLink[]
  /** Optional right-side slot (locale picker, social icons). */
  right?: Snippet | string
  /** Extra classes. */
  className?: string
}
