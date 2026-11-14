import type { Snippet } from 'svelte'

/** Props accepted by the {@link AppShellLayout} component. */
export interface AppShellLayoutProps {
  /** Slot for the header (typically the app's `<Header />`). */
  header?: Snippet
  /** Slot for the footer (typically the app's `<Footer />`). */
  footer?: Snippet
  /** Main content. Pass the routed content for routed apps. */
  children: Snippet
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
