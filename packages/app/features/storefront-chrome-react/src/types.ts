/**
 * Shared types for storefront-chrome primitives.
 *
 * @module
 */

import type { ReactNode } from 'react'

export interface NavLinkSpec {
  to: string
  label: ReactNode
  /** Visually highlights the link as the current page. */
  active?: boolean
  dataMolId?: string
}

export interface NavActionSpec {
  to: string
  /** Material-symbols icon name. */
  icon: string
  ariaLabel: string
  /** Optional numeric badge (e.g. cart count). Hidden when <= 0. */
  badgeCount?: number
  dataMolId?: string
}

export interface ProfileMenuItem {
  to: string
  label: ReactNode
  dataMolId?: string
}

export interface FooterColumn {
  heading: ReactNode
  links: { to: string; label: ReactNode }[]
}
