/**
 * Shared types for the Vue storefront-chrome primitives — the counterparts of
 * `@molecule/app-storefront-chrome-react`'s types, with node values typed as
 * Vue nodes.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Describes a navigation link rendered in the storefront header nav bar. */
export interface NavLinkSpec {
  to: string
  label: VNodeChild
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
  label: VNodeChild
  dataMolId?: string
}

/** Describes a single column of links rendered in the storefront footer. */
export interface FooterColumn {
  heading: VNodeChild
  links: { to: string; label: VNodeChild }[]
}
