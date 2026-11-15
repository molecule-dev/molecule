import type { JSX } from 'solid-js'

/** Props for {@link DetailPageLayout}. */
export interface DetailPageLayoutProps {
  /** Breadcrumb rendered above everything. */
  breadcrumb?: JSX.Element
  /** Sticky top bar — title, status, actions. */
  topBar?: JSX.Element
  /** Main content column (usually stacked cards / sections). */
  main: JSX.Element
  /** Optional sidebar column (related items, metadata cards). */
  sidebar?: JSX.Element
  /** Sidebar position — `'right'` default or `'left'`. */
  sidebarPosition?: 'left' | 'right'
  /** Sidebar width preset. Defaults to `'md'`. */
  sidebarWidth?: 'sm' | 'md' | 'lg'
  /** Extra classes on the outer wrapper. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
