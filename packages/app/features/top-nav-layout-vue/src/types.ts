/**
 * Types for the Vue top navigation app shell.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** A single navigation item rendered in the top nav bar. */
export interface TopNavItem {
  /** Route path the link goes to. */
  to: string
  /** Stable key — used to key the rendered link and as the i18n key suffix in apps. */
  key: string
  /** Material symbol icon name (or any glyph) shown next to the label. */
  icon?: string
  /** Visible label. Apps that route this through `t(...)` should pass the resolved string. */
  label: string
}

/** Props accepted by the {@link TopNavLayout} component. */
export interface TopNavLayoutProps {
  /** Brand text shown in the top-left link (typically the app name). */
  appName: string
  /** Path the brand link navigates to. Defaults to `'/'`. */
  logoTo?: string
  /** Horizontal nav items rendered in the header. */
  navItems: ReadonlyArray<TopNavItem>
  /**
   * Node rendered at the right of the header (typically a user menu). Passed
   * as a prop or as the same-named slot — both work.
   */
  userMenu?: VNodeChild
  /**
   * Aria-label for the primary `<nav>`. Overrides the translated /
   * `defaultValue` `'Primary navigation'` (prop > `t()` > default).
   */
  navAriaLabel?: string
  /** Extra classes on the outer wrapper. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
  /**
   * The routed page body — the DEFAULT slot. React renders its router's
   * `<Outlet />` here; pass the routed view (`<RouterView />`) or any content.
   */
  children?: VNodeChild
}
