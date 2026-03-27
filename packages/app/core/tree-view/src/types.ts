/**
 * TreeView provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete tree-view implementation.
 *
 * @module
 */

/**
 *
 */
export interface TreeViewProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface TreeViewConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
