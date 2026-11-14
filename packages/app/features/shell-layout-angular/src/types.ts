/**
 * Types of `@molecule/app-shell-layout-angular` — the Angular counterpart of
 * `@molecule/app-shell-layout-react`, same props and DOM.
 *
 * @module
 */

/**
 * Props accepted by {@link AppShellLayout} — the same props
 * `@molecule/app-shell-layout-react` accepts. Node props (`header`, `footer`,
 * `children`) are projected content in Angular (an input cannot carry a node),
 * so they are typed `unknown`: pass them in the host template, not as values.
 */
export interface AppShellLayoutProps {
  /** Slot for the header (typically the app's `<app-header>`), projected as `[slot=header]` content. */
  header?: unknown
  /** Slot for the footer (typically the app's `<app-footer>`), projected as `[slot=footer]` content. */
  footer?: unknown
  /** Main content, projected as the element's default content. */
  children?: unknown
  /** Container max-width for the main content. Defaults to `'xl'`. */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | string
  /** Extra classes on the outer wrapper. */
  className?: string
  /**
   * Extra classes on the inner `<main>` element. Apps that need vertical
   * rhythm around the routed content pass it here instead of forking the
   * shell. Omitted by default so the `<main>` carries no padding.
   */
  mainClassName?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
