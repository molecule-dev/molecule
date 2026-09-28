/**
 * Configuration for the in-memory provider.
 *
 * @module
 */

/**
 * Provider-specific configuration options. The in-memory bond needs none
 * beyond the core's `QueryClientConfig`; the type exists so `createProvider`
 * has the same shape as every other bond's.
 */
export interface MemoryQueryConfig {
  /** Reserved. */
  readonly _?: never
}
