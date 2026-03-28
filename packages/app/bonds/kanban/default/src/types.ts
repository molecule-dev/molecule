/**
 * Default kanban provider configuration types.
 *
 * @module
 */

/**
 * Provider-specific configuration for the default kanban provider.
 */
export interface DefaultKanbanConfig {
  /**
   * Whether to deep-clone card data when returning snapshots.
   * When `false` (default), card `data` fields are returned by reference for
   * performance. Set to `true` if consumers may mutate returned card data and
   * you need snapshot isolation.
   *
   * Defaults to `false`.
   */
  cloneCardData?: boolean
}
