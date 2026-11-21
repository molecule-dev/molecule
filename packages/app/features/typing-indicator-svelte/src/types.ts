/**
 * Types for the Svelte three-dot typing indicator.
 *
 * @module
 */

/** Props accepted by the {@link TypingIndicator} component. */
export interface TypingIndicatorProps {
  /** Whether to render. Defaults to true. */
  visible?: boolean
  /** Dot diameter in pixels. Defaults to 6. */
  dotSize?: number
  /** Animation duration in ms. Defaults to 1200. */
  durationMs?: number
  /**
   * Accessible label. Overrides the translated / `defaultValue` `'Typing…'`
   * (prop > `t()` > default).
   */
  ariaLabel?: string
  /** Extra classes. */
  className?: string
}
