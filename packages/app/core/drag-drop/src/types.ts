/**
 * DragDrop provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete drag-drop implementation.
 *
 * @module
 */

/**
 *
 */
export interface DragDropProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface DragDropConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
