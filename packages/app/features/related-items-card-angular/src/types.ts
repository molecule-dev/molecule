/**
 * Types of `@molecule/app-related-items-card-angular` — the Angular
 * counterpart of `@molecule/app-related-items-card-react`, same props and DOM.
 *
 * @module
 */

/**
 * Props accepted by {@link RelatedItemsCard} — the same props
 * `@molecule/app-related-items-card-react` accepts. Node-valued props
 * (`title`, `icon`, `emptyState`, `headerActions`) are projected content in
 * Angular (an input cannot carry a node): pass a string value through the
 * input, and element content in the host template as `[slot=<name>]` content.
 */
export interface RelatedItemsCardProps<T> {
  /**
   * Card heading. A string or number renders as text; element content is
   * projected as `[slot=title]` content instead.
   */
  title?: unknown
  /** Optional leading icon, projected as `[slot=icon]` content. */
  icon?: unknown
  /** Items to render. */
  items: readonly T[]
  /**
   * Render function for each item. Angular passes a `TemplateRef` whose
   * context carries the item as `$implicit` (and `a0`, the way the conformance
   * kit maps a React render function) and the index as `a1`.
   */
  renderItem?: unknown
  /** Called when an item row is clicked (if applicable). */
  onItemClick?: (item: T, index: number) => void
  /**
   * Rendered when `items` is empty. A string or number renders as text;
   * element content is projected as `[slot=emptyState]` content instead.
   */
  emptyState?: unknown
  /** Optional "View all" link rendered in the header. */
  viewAllHref?: string
  /** Optional right-aligned header actions, projected as `[slot=headerActions]` content. */
  headerActions?: unknown
  /** Extra classes on the Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
