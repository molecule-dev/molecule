/**
 * Shared types for storefront-chrome primitives.
 *
 * @module
 */

import type { ReactNode } from 'react'

/** Describes a navigation link rendered in the storefront header nav bar. */
export interface NavLinkSpec {
  to: string
  label: ReactNode
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
  label: ReactNode
  dataMolId?: string
}

/** Describes a single column of links rendered in the storefront footer. */
export interface FooterColumn {
  heading: ReactNode
  links: { to: string; label: ReactNode }[]
}
