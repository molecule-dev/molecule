import type { ReactNode } from 'react'

/**
 * Nav item shape shared by top/side/bottom nav shells.
 *
 * @module
 */
export interface NavItem {
  /** Unique id (React key + active-state matcher). */
  id: string
  /** Display label. */
  label: ReactNode
  /** Optional leading icon. */
  icon?: ReactNode
  /**
   * Route target. The shells do NOT render links — every item renders a
   * button and navigation is delegated to `onItemClick` (call your
   * router there, e.g. `navigate(item.to)`). `to` is carried through
   * untouched for exactly that purpose.
   */
  to?: string
  /** Optional badge / count to the right of the label. */
  badge?: ReactNode
  /** When true, the item is rendered in a disabled visual state. */
  disabled?: boolean
}

/**
 * A labeled group of NavItems rendered as a collapsible section in side/bottom nav shells.
 */
export interface NavGroup {
  /** Group id. */
  id: string
  /** Optional heading above the group. */
  heading?: ReactNode
  /** Items in this group. */
  items: NavItem[]
}
