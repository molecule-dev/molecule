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
  /** Route target — when provided, the item renders as a link. */
  to?: string
  /** Optional badge / count to the right of the label. */
  badge?: ReactNode
  /** When true, the item is rendered in a disabled visual state. */
  disabled?: boolean
}

/**
 *
 */
export interface NavGroup {
  /** Group id. */
  id: string
  /** Optional heading above the group. */
  heading?: ReactNode
  /** Items in this group. */
  items: NavItem[]
}
