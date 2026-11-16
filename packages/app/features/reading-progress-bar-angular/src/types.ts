/**
 * Types of `@molecule/app-reading-progress-bar-angular` — the Angular
 * counterpart of `@molecule/app-reading-progress-bar-react`, same props and
 * DOM.
 *
 * @module
 */

/**
 * Props accepted by {@link ReadingProgressBar} — the same props
 * `@molecule/app-reading-progress-bar-react` accepts.
 */
export interface ReadingProgressBarProps {
  /**
   * Optional ref to the article element. When provided, progress is measured
   * against that element's bounding rect (so the bar fills as the user scrolls
   * through the article body, not the whole page). When omitted, progress
   * falls back to `window` scroll position.
   */
  containerRef?: { readonly current?: Element | null }
  /** Bar thickness in pixels. Defaults to `3`. */
  thickness?: number
  /**
   * Where the bar pins. Defaults to `'top'`. Both variants render fixed across
   * the full viewport width with a high z-index.
   */
  position?: 'top' | 'bottom'
  /**
   * CSS color for the filled portion of the bar. Defaults to `'currentColor'`
   * so the bar inherits whatever text color is in scope — letting the
   * surrounding theme drive it. Pass a theme-aware color (`'var(--brand)'`,
   * etc.) to override.
   */
  color?: string
  /** Extra classes on the outer wrapper. */
  className?: string
  /** `data-mol-id` for AI-agent / E2E selectors. */
  dataMolId?: string
}
