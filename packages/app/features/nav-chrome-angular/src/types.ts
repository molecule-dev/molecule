/**
 * Types of `@molecule/app-nav-chrome-angular` — the Angular counterpart of
 * `@molecule/app-nav-chrome-react`, same props and DOM.
 *
 * @module
 */

/**
 * Nav item shape shared by the top/side/bottom nav shells. Node-valued
 * fields (`label`, `icon`, `badge`) are projected or templated content in
 * Angular (an input cannot carry a node), so they are typed `unknown`: pass
 * plain strings or `<ng-template>` refs.
 */
export interface NavItem {
  /** Unique id (the list key + active-state matcher). */
  id: string
  /** Display label — a string or a template ref. */
  label: unknown
  /** Optional leading icon — a string or a template ref. */
  icon?: unknown
  /**
   * Route target. The shells do NOT render links — every item renders a
   * button and navigation is delegated to `onItemClick`. `to` is carried
   * through untouched for exactly that purpose.
   */
  to?: string
  /** Optional badge / count to the right of the label — a string or a template ref. */
  badge?: unknown
  /** When true, the item is rendered in a disabled visual state. */
  disabled?: boolean
}

/**
 * A labeled group of {@link NavItem}s rendered as a section in the side nav.
 */
export interface NavGroup {
  /** Group id. */
  id: string
  /** Optional heading above the group — a string or a template ref. */
  heading?: unknown
  /** Items in this group. */
  items: NavItem[]
}

/** A single navigable link rendered in the footer link row. */
export interface FooterLink {
  /** Link text — a string or a template ref. */
  label: unknown
  /** `href` target; defaults to `#`. */
  to?: string
}

/**
 * Props accepted by {@link AppShellTopNav} — the same props
 * `@molecule/app-nav-chrome-react` accepts. Node props (`logo`, `right`) are
 * projected content in Angular, so they are typed `unknown`.
 */
export interface AppShellTopNavProps {
  /** Left-side brand / logo slot, projected as `[slot=logo]` content. */
  logo?: unknown
  /** Centre nav items (usually the primary app sections). */
  items?: NavItem[]
  /** Which item is currently active (by `id`). */
  activeId?: string
  /** Called when an item is clicked (hand off to your router). */
  onItemClick?: (item: NavItem) => void
  /** Right-side slot, projected as `[slot=right]` content. */
  right?: unknown
  /** Extra classes. */
  className?: string
}

/**
 * Props accepted by {@link AppShellBottomNav} — the same props
 * `@molecule/app-nav-chrome-react` accepts.
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
 * Props accepted by {@link AppShellSideNav} — the same props
 * `@molecule/app-nav-chrome-react` accepts. Node props (`header`, `footer`)
 * are projected content in Angular, so they are typed `unknown`.
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
  /** Optional header slot, projected as `[slot=header]` content. */
  header?: unknown
  /** Optional footer slot, projected as `[slot=footer]` content. */
  footer?: unknown
  /** Extra classes. */
  className?: string
}

/**
 * Props accepted by {@link AppShellFooter} — the same props
 * `@molecule/app-nav-chrome-react` accepts. Node props (`logo`, `copyright`,
 * `right`) are projected content in Angular, so they are typed `unknown`.
 */
export interface AppShellFooterProps {
  /** Optional brand / logo, projected as `[slot=logo]` content. */
  logo?: unknown
  /** Optional copyright text, projected as `[slot=copyright]` content. */
  copyright?: unknown
  /** Footer links — rendered in a row. */
  links?: FooterLink[]
  /** Optional right-side slot, projected as `[slot=right]` content. */
  right?: unknown
  /** Extra classes. */
  className?: string
}
