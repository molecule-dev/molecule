/**
 * FeatureFlags provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete feature-flags implementation.
 *
 * @module
 */

/**
 *
 */
export interface FeatureFlagsProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface FeatureFlagsConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
