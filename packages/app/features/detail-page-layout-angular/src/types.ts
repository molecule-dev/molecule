/**
 * Types of `@molecule/app-detail-page-layout-angular` — the Angular
 * counterpart of `@molecule/app-detail-page-layout-react`, same props and
 * DOM.
 *
 * @module
 */

/**
 * Props for {@link DetailPageLayout} — the same props
 * `@molecule/app-detail-page-layout-react` accepts. Node props (`breadcrumb`,
 * `topBar`, `main`, `sidebar`) are projected content in Angular (an input
 * cannot carry a node), so they are typed `unknown`: pass them in the host
 * template, not as values.
 */
export interface DetailPageLayoutProps {
  /** Breadcrumb rendered above everything, projected as `[slot=breadcrumb]` content. */
  breadcrumb?: unknown
  /** Sticky top bar — title, status, actions, projected as `[slot=topBar]` content. */
  topBar?: unknown
  /** Main content column (usually stacked cards / sections), projected as `[slot=main]` content. */
  main?: unknown
  /** Optional sidebar column (related items, metadata cards), projected as `[slot=sidebar]` content. */
  sidebar?: unknown
  /** Sidebar position — `'right'` default or `'left'`. */
  sidebarPosition?: 'left' | 'right'
  /** Sidebar width preset. Defaults to `'md'`. */
  sidebarWidth?: 'sm' | 'md' | 'lg'
  /** Extra classes on the outer wrapper. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
