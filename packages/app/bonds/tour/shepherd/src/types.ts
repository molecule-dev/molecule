/**
 * Configuration for the Shepherd tour provider.
 *
 * @module
 */

/**
 * Labels for the nav buttons shepherd renders in each step's footer.
 *
 * shepherd.js draws real buttons, so the bond has to supply their text. These
 * are user-facing strings — pass them already translated, e.g.
 * `{ back: t('tour.back', {}, { defaultValue: 'Back' }), … }`. Any label left
 * unset falls back to its English default (`Back` / `Next` / `Done`).
 */
export interface ShepherdLabels {
  /** Label for the "back" button (shown on every step after the first). Defaults to `Back`. */
  back?: string

  /** Label for the "next" button (shown on every step before the last). Defaults to `Next`. */
  next?: string

  /** Label for the "done" button (shown on the last step). Defaults to `Done`. */
  done?: string
}

/**
 * Provider-level defaults for the Shepherd tour provider.
 *
 * `overlay` sets the default for shepherd's modal backdrop (`useModalOverlay`)
 * and the resolved `hasOverlay()` flag; `showButtons` sets whether nav buttons
 * are rendered and the resolved `hasButtons()` flag. A per-tour
 * `TourOptions.overlay` / `TourOptions.showButtons` overrides them; if neither
 * is set, both default to `true`. `labels` provides the nav-button text.
 */
export interface ShepherdConfig {
  /**
   * Default for the modal backdrop / `hasOverlay()` when a tour does not set
   * `overlay`. Feeds shepherd's `useModalOverlay`. Defaults to `true`.
   */
  overlay?: boolean

  /**
   * Default for whether nav buttons render / `hasButtons()` when a tour does
   * not set `showButtons`. Defaults to `true`.
   */
  showButtons?: boolean

  /**
   * Labels for the rendered nav buttons. Supply translated strings; each
   * omitted label falls back to its English default.
   */
  labels?: ShepherdLabels
}
