/**
 * Type definitions for the default in-process scheduler provider.
 * @module
 */

/**
 * Configuration options for the default scheduler provider.
 */
export interface DefaultSchedulerOptions {
  /**
   * Stagger offset in milliseconds between task starts to prevent
   * thundering herd. Defaults to 2000.
   */
  staggerMs?: number
}
