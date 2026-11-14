/**
 * Types for the Vue app-shell header.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Props for the {@link AppHeader} component. */
export interface AppHeaderProps {
  /** Brand display name shown next to the logo. */
  appName: string
  /** Logo image source. Defaults to `/logo.svg` (the convention scaffolded by mlcl). */
  logoSrc?: string
  /** Logo size in pixels (square). Defaults to 30 to match the flagship-app convention. */
  logoSize?: number
  /** Path the brand link navigates to. Defaults to `/`. */
  brandTo?: string
  /**
   * Slot for the right-side user menu — typically `<UserMenu />` from
   * `@molecule/app-ui-vue`. Passed as a prop or as the same-named slot — both
   * work. `null` contributes nothing.
   */
  userMenu?: VNodeChild | null
  /**
   * Theme toggle slot. Defaults to a resilient wrapper around
   * `<ThemeToggle />` (from `@molecule/app-ui-vue`) that renders the toggle
   * ONLY when the binding's theme and i18n providers are both installed above
   * the header, and omits it (never throws) when they are not — so the header
   * renders out of the box even before theme/i18n are wired. Pass `null` to
   * force-hide it, or your own component (e.g. an icon-bonded variant) to
   * override. Passed as a prop or as the same-named slot — both work.
   */
  themeToggle?: VNodeChild | null
  /**
   * Optional extra actions rendered between the theme toggle and the user
   * menu. Passed as a prop or as the same-named slot — both work. `null`
   * contributes nothing.
   */
  extraActions?: VNodeChild | null
  /**
   * Apply `cm.headerFixed` for sticky/fixed positioning. Defaults to `true`,
   * matching the flagship-app convention. Set to `false` for a non-sticky header.
   */
  fixed?: boolean
  /** Extra className on the outer `<header>` (composed with `cm.headerBar` + optional `cm.headerFixed`). */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
