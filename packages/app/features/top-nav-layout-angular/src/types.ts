/**
 * Types of `@molecule/app-top-nav-layout-angular` — the Angular counterpart
 * of `@molecule/app-top-nav-layout-react`, same props and DOM.
 *
 * @module
 */

/** A single navigation item rendered in the top nav bar. */
export interface TopNavItem {
  /** Route path the link goes to. */
  to: string
  /** Stable key — tracks the rendered link and is the i18n key suffix in apps. */
  key: string
  /** Material symbol icon name (or any glyph) shown next to the label. */
  icon?: string
  /** Visible label. Apps that route this through `t(...)` should pass the resolved string. */
  label: string
}

/**
 * Props accepted by {@link TopNavLayout} — the same props
 * `@molecule/app-top-nav-layout-react` accepts. Node props (`userMenu`, the
 * routed page body) are projected content in Angular (an input cannot carry a
 * node), so they are typed `unknown`: pass them in the host template, not as
 * values.
 */
export interface TopNavLayoutProps {
  /** Brand text shown in the top-left link (typically the app name). */
  appName: string
  /** Path the brand link navigates to. Defaults to `'/'`. */
  logoTo?: string
  /** Horizontal nav items rendered in the header. */
  navItems: ReadonlyArray<TopNavItem>
  /** User menu, projected as `[slot=userMenu]` content. */
  userMenu?: unknown
  /** Aria-label for the primary `<nav>`. Defaults to `'Primary navigation'`. */
  navAriaLabel?: string
  /** Extra classes on the outer wrapper. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
  /**
   * The routed page body, projected as the element's default content. React
   * renders its router's `<Outlet />` in the `<main>`.
   */
  children?: unknown
}
