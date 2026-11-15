/**
 * Types for the Solid card container for cross-linked / related item lists.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Props accepted by the {@link RelatedItemsCard} component. */
export interface RelatedItemsCardProps<T> {
  /** Card heading. */
  title: JSX.Element
  /** Optional leading icon in the header. */
  icon?: JSX.Element
  /** Items to render. */
  items: readonly T[]
  /** Render function for each item. */
  renderItem: (item: T, index: number) => JSX.Element
  /** Called when an item row is clicked (if applicable). */
  onItemClick?: (item: T, index: number) => void
  /** Rendered when `items` is empty. */
  emptyState?: JSX.Element
  /** Optional "View all" link rendered in the header. */
  viewAllHref?: string
  /** Optional right-aligned header actions (e.g. "Add new" button). */
  headerActions?: JSX.Element
  /** Extra classes on the Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
