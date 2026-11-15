/**
 * Types for the Vue card container for cross-linked / related item lists.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Props accepted by the {@link RelatedItemsCard} component. */
export interface RelatedItemsCardProps<T> {
  /**
   * Card heading. A string renders as text; a node is passed as the prop or
   * as the same-named slot — both work.
   */
  title: VNodeChild
  /**
   * Optional leading icon in the header. A node is passed as the prop or as
   * the same-named `icon` slot — both work.
   */
  icon?: VNodeChild
  /** Items to render. */
  items: readonly T[]
  /** Render function for each item. */
  renderItem: (item: T, index: number) => VNodeChild
  /** Called when an item row is clicked (if applicable). */
  onItemClick?: (item: T, index: number) => void
  /**
   * Rendered when `items` is empty. A node is passed as the prop or as the
   * same-named `emptyState` slot — both work.
   */
  emptyState?: VNodeChild
  /** Optional "View all" link rendered in the header. */
  viewAllHref?: string
  /**
   * Optional right-aligned header actions (e.g. "Add new" button). A node is
   * passed as the prop or as the same-named `headerActions` slot — both work.
   */
  headerActions?: VNodeChild
  /** Extra classes on the Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
