/**
 * Types for the Svelte vertical sidebar app shell.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** Describes a single item in the sidebar's vertical navigation list. */
export interface SidebarNavItem {
  /** Route path the link goes to. */
  to: string
  /** Stable key — used for list keys and i18n key suffix. */
  key: string
  /** Material symbol icon name. */
  icon?: string
  /** Visible label. Apps that route this through `t(...)` should pass the resolved string. */
  label: string
}

/**
 * Semantic sidebar width. Mapped to a fixed pixel width internally and applied
 * via inline style (a width is one of the "specific values" a styling-agnostic
 * ClassMap cannot express as a swappable token) so the sidebar renders the same
 * regardless of which ClassMap bond is active — no Tailwind width utility leaks
 * into consumer code.
 *
 * - `sm` → 208px, `md` → 240px (default), `lg` → 256px.
 * - Pass a raw `number` for an exact pixel width.
 */
export type SidebarWidth = 'sm' | 'md' | 'lg' | number

/** Props accepted by the {@link SidebarLayout} component. */
export interface SidebarLayoutProps {
  /** Brand text shown at the top of the sidebar (typically the app name). */
  appName: string
  /** Path the brand link navigates to. Defaults to `'/'`. */
  logoTo?: string
  /** Vertical nav items rendered in the sidebar. */
  navItems: ReadonlyArray<SidebarNavItem>
  /** Snippet rendered at the bottom of the sidebar (typically a user menu). */
  userMenu?: Snippet
  /** Optional snippet rendered next to the user menu (typically a theme toggle). */
  themeToggle?: Snippet
  /**
   * Aria-label for the primary `<nav>`. Overrides the translated default
   * (`sidebarLayout.aria.primaryNavigation`, English `'Primary navigation'`);
   * prop > `t()` > default.
   */
  navAriaLabel?: string
  /**
   * Sidebar width — a stack-agnostic preset (`'sm'` | `'md'` | `'lg'`) or an
   * exact pixel `number`. Applied via inline style. Defaults to `'md'` (240px).
   */
  sidebarWidth?: SidebarWidth
  /**
   * Legacy sidebar-width prop retained only for backward compatibility: a
   * `w-<n>` value is PARSED to a pixel width and applied via inline style
   * (never re-emitted as a class). `sidebarWidth` takes precedence.
   *
   * @deprecated Use {@link SidebarLayoutProps.sidebarWidth} instead.
   */
  sidebarWidthClass?: string
  /** Extra classes on the outer wrapper. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
  /**
   * The routed page body. React renders React Router's `<Outlet />` in the
   * `<main>`; pass the routed view (the layout's page content) here.
   */
  children?: Snippet
}
