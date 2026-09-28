/**
 * Configuration for the MiniSearch provider.
 *
 * @module
 */

/**
 * Provider-specific configuration options.
 */
export interface MinisearchConfig {
  /**
   * How several free-text terms combine. `'AND'` (the default) requires every
   * term, falling back to `'OR'` when that finds nothing, so `stripe billing`
   * prefers documents mentioning both but still finds one that mentions either.
   * `'OR'` ranks the union from the start.
   */
  combineWith?: 'AND' | 'OR'
}
