/**
 * Configuration for the default timeline provider.
 *
 * @module
 */

/**
 * Provider-specific configuration options.
 */
export interface DefaultTimelineConfig {
  /** Default orientation. Defaults to `'vertical'`. */
  orientation?: 'vertical' | 'horizontal'

  /** Whether to sort items by date. Defaults to `true`. */
  sortByDate?: boolean
}
