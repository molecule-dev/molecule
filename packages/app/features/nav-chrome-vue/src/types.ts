/**
 * Types of `@molecule/app-nav-chrome-vue` — the Vue counterpart of
 * `@molecule/app-nav-chrome-react`, same props and DOM.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/**
 * Nav item shape shared by the top/side/bottom nav shells.
 *
 * @module
 */
export interface NavItem {
  /** Unique id (the list key + active-state matcher). */
  id: string
  /** Display label. */
  label: VNodeChild
  /** Optional leading icon. */
  icon?: VNodeChild
  /**
   * Route target. The shells do NOT render links — every item renders a
   * button and navigation is delegated to `onItemClick`. `to` is carried
   * through untouched for exactly that purpose.
   */
  to?: string
  /** Optional badge / count to the right of the label. */
  badge?: VNodeChild
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
  heading?: VNodeChild
  /** Items in this group. */
  items: NavItem[]
}

/** A single navigable link rendered in the footer link row. */
export interface FooterLink {
  /** Link text. */
  label: VNodeChild
  /** `href` target; defaults to `#`. */
  to?: string
}

/**
 * Props for {@link AppShellTopNav}. Node-valued props (`logo`, `right`) are
 * accepted as a prop or as the same-named slot; both work.
 */
export interface AppShellTopNavProps {
  /** Left-side brand / logo slot. */
  logo?: VNodeChild
  /** Centre nav items (usually the primary app sections). */
  items?: NavItem[]
  /** Which item is currently active (by `id`). */
  activeId?: string
  /** Called when an item is clicked (hand off to your router). */
  onItemClick?: (item: NavItem) => void
  /** Right-side slot — user menu, notifications, theme toggle, etc. */
  right?: VNodeChild
  /** Extra classes. */
  className?: string
}

/**
 * Props for {@link AppShellBottomNav}.
 */
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

/**
 * Props for {@link AppShellSideNav}. Node-valued props (`header`, `footer`)
 * are accepted as a prop or as the same-named slot; both work.
 */
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
  header?: VNodeChild
  /** Optional footer slot (theme toggle, sign-out). */
  footer?: VNodeChild
  /** Extra classes. */
  className?: string
}

/**
 * Props for {@link AppShellFooter}. Node-valued props (`logo`, `copyright`,
 * `right`) are accepted as a prop or as the same-named slot; both work.
 */
export interface AppShellFooterProps {
  /** Optional brand / logo. */
  logo?: VNodeChild
  /** Optional copyright text. */
  copyright?: VNodeChild
  /** Footer links — rendered in a row. */
  links?: FooterLink[]
  /** Optional right-side slot (locale picker, social icons). */
  right?: VNodeChild
  /** Extra classes. */
  className?: string
}
