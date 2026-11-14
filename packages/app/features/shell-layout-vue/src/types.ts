/**
 * Types for the Vue top-level app shell layout.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Props accepted by the {@link AppShellLayout} component. */
export interface AppShellLayoutProps {
  /**
   * Slot for the header (typically the app's `<AppHeader />`). Passed as a
   * prop or as the same-named slot — both work.
   */
  header?: VNodeChild
  /**
   * Slot for the footer (typically the app's `<AppFooter />`). Passed as a
   * prop or as the same-named slot — both work.
   */
  footer?: VNodeChild
  /**
   * Main content — the DEFAULT slot. Pass the routed view (`<RouterView />`)
   * for routed apps; any content works.
   */
  children?: VNodeChild
  /** Container max-width for the main content. Defaults to `'xl'`. */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | string
  /** Extra classes on the outer wrapper. */
  className?: string
  /**
   * Extra classes on the inner `<main>` element. Apps that need
   * vertical rhythm around the routed content (e.g. `cm.sp('py', 8)`)
   * pass it here instead of forking the shell. Omitted by default so
   * the `<main>` carries no padding.
   */
  mainClassName?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
