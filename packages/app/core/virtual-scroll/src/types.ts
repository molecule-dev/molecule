/**
 * VirtualScroll provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete virtual-scroll implementation.
 *
 * @module
 */

/**
 *
 */
export interface VirtualScrollProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface VirtualScrollConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
