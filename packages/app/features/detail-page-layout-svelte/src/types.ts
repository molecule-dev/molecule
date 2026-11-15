import type { Snippet } from 'svelte'

/** Props for {@link DetailPageLayout}. */
export interface DetailPageLayoutProps {
  /** Breadcrumb rendered above everything. */
  breadcrumb?: Snippet
  /** Sticky top bar — title, status, actions. */
  topBar?: Snippet
  /** Main content column (usually stacked cards / sections). */
  main: Snippet
  /** Optional sidebar column (related items, metadata cards). */
  sidebar?: Snippet
  /** Sidebar position — `'right'` default or `'left'`. */
  sidebarPosition?: 'left' | 'right'
  /** Sidebar width preset. Defaults to `'md'`. */
  sidebarWidth?: 'sm' | 'md' | 'lg'
  /** Extra classes on the outer wrapper. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
