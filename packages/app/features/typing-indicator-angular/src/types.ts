/**
 * Types of `@molecule/app-typing-indicator-angular` — the Angular counterpart
 * of `@molecule/app-typing-indicator-react`, same props and DOM.
 *
 * @module
 */

/**
 * Props accepted by {@link TypingIndicator} — the same props
 * `@molecule/app-typing-indicator-react` accepts.
 */
export interface TypingIndicatorProps {
  /** Whether to render. Defaults to true. */
  visible?: boolean
  /** Dot diameter in pixels. Defaults to 6. */
  dotSize?: number
  /** Animation duration in ms. Defaults to 1200. */
  durationMs?: number
  /** Accessible label. */
  ariaLabel?: string
  /** Extra classes. */
  className?: string
}
