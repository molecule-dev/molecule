/**
 * Types for the Svelte card container for cross-linked / related item lists.
 *
 * @module
 */

import type { Snippet } from 'svelte'

import type { ReactNodeProp } from './node-prop.js'

/** Props accepted by the {@link RelatedItemsCard} component. */
export interface RelatedItemsCardProps<T> {
  /** Card heading. A string renders as text; a node arrives as the same-named snippet. */
  title: ReactNodeProp
  /** Optional leading icon in the header; arrives as the same-named snippet. */
  icon?: ReactNodeProp
  /** Items to render. */
  items: readonly T[]
  /** Render function for each item; arrives as a snippet with the item and its index. */
  renderItem: Snippet<[T, number]>
  /** Called when an item row is clicked (if applicable). */
  onItemClick?: (item: T, index: number) => void
  /** Rendered when `items` is empty; arrives as the same-named snippet. */
  emptyState?: ReactNodeProp
  /** Optional "View all" link rendered in the header. */
  viewAllHref?: string
  /** Optional right-aligned header actions; arrives as the same-named snippet. */
  headerActions?: ReactNodeProp
  /** Extra classes on the Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
