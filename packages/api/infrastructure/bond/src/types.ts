/**
 * Shared type definitions for the bond provider-wiring system.
 *
 * These types describe the runtime registry structure and configuration
 * options used by the bond module. Domain-specific provider interfaces
 * (EmailTransport, PaymentProvider, etc.) live in their own core packages
 * and are not defined here.
 *
 * @module
 */

/**
 * Minimal base interface that every bondable provider can optionally satisfy.
 * Provider implementations may include a `name` for logging and debugging
 * but are not required to extend this interface.
 */
export interface Provider {
  /**
   * Optional human-readable identifier for this provider, used in log
   * output and error messages.
   */
  readonly name?: string
}

/**
 * Internal data structure that holds all bonded providers at runtime.
 * The registry distinguishes between singleton providers (one per category)
 * and named providers (multiple per category, keyed by a string name).
 */
export interface ProviderRegistry {
  /**
   * Map from category string (e.g. `'email'`, `'store'`) to the single
   * active provider instance for that category.
   */
  singletons: Map<string, unknown>

  /**
   * Two-level map: outer key is the category string (e.g. `'oauth'`,
   * `'payments'`), inner key is the provider name (e.g. `'github'`,
   * `'stripe'`), value is the provider instance.
   */
  named: Map<string, Map<string, unknown>>
}

/**
 * Options that control bond registration behavior.
 */
export interface BondConfig {
  /**
   * When `true`, bonding a provider to a category that already has a bonded
   * provider throws an error instead of silently replacing it.
   * @default false
   */
  strict?: boolean

  /**
   * When `true`, bond and unbond operations emit diagnostic log output.
   * @default false
   */
  verbose?: boolean
}
