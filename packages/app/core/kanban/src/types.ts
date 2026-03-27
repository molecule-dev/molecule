/**
 * Kanban provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete kanban implementation.
 *
 * @module
 */

/**
 *
 */
export interface KanbanProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface KanbanConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
