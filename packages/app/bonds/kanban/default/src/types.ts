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
   * Whether to deep-clone card `data` when returning snapshots.
   * When `false` (default), card `data` fields are returned by reference for
   * performance. Set to `true` to deep-clone (via `structuredClone`) each
   * card's `data` in every returned snapshot — `getColumns`, `getColumn`,
   * `findCard`, `getState`, and `onUpdate` — so consumers may mutate returned
   * card data without affecting internal board state.
   *
   * Defaults to `false`.
   */
  cloneCardData?: boolean
}
