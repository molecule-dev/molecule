/**
 * Configuration for the default timeline provider.
 *
 * @module
 */

/**
 * Provider-specific configuration options.
 */
export interface DefaultTimelineConfig {
  /**
   * Reserved — NOT consumed by this headless provider. Orientation is a
   * rendering concern: pass `orientation` on `TimelineOptions` and apply it
   * in your own rendering of `getItems()`.
   */
  orientation?: 'vertical' | 'horizontal'

  /** Whether to sort items by date. Defaults to `true`. */
  sortByDate?: boolean
}
