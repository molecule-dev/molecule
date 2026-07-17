/**
 * Configuration for the Shepherd tour provider.
 *
 * @module
 */

/**
 * Provider-level defaults for the tour provider.
 *
 * These set the DEFAULT value of the resolved UI flags each tour instance
 * exposes via `hasOverlay()` / `hasButtons()`. A per-tour
 * `TourOptions.overlay` / `TourOptions.showButtons` overrides them; if neither
 * is set, the flags default to `true`. The provider still draws no UI itself —
 * the consumer reads the resolved flags off the instance to decide what to
 * render (see the module notes).
 */
export interface ShepherdConfig {
  /**
   * Default for `hasOverlay()` when a tour does not set `overlay`.
   * Defaults to `true`.
   */
  overlay?: boolean

  /**
   * Default for `hasButtons()` when a tour does not set `showButtons`.
   * Defaults to `true`.
   */
  showButtons?: boolean
}
