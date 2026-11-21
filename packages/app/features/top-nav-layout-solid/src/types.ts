/**
 * Types for the Solid top navigation app shell.
 *
 * @module
 */

import type { JSX } from 'solid-js'

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
  /** Node rendered at the right of the header (typically a user menu). */
  userMenu?: JSX.Element
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
   * The routed page body. React renders its router's `<Outlet />` in the
   * `<main>`; pass the routed view or any content here.
   */
  children?: JSX.Element
}
