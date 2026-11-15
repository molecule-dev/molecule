import type { VNodeChild } from 'vue'

/** Props for {@link DetailPageLayout}. */
export interface DetailPageLayoutProps {
  /** Breadcrumb rendered above everything. */
  breadcrumb?: VNodeChild
  /** Sticky top bar — title, status, actions. */
  topBar?: VNodeChild
  /** Main content column (usually stacked cards / sections). */
  main: VNodeChild
  /** Optional sidebar column (related items, metadata cards). */
  sidebar?: VNodeChild
  /** Sidebar position — `'right'` default or `'left'`. */
  sidebarPosition?: 'left' | 'right'
  /** Sidebar width preset. Defaults to `'md'`. */
  sidebarWidth?: 'sm' | 'md' | 'lg'
  /** Extra classes on the outer wrapper. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
